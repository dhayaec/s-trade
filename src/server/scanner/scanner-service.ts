/**
 * Scanner Service
 * Bulk-scan a list of symbols through the analysis engine, rank the resulting
 * opportunities by score, apply user filters, and produce summary statistics.
 *
 * The scanner is intentionally decoupled from data fetching and the analysis
 * engine internals: it talks to a `SymbolAnalysisSource` abstraction so the
 * same logic can be exercised in unit tests with a fake source.
 */
import type { EngineOutput } from '@/analysis/engine/interfaces';
import type { AnalysisContext, StrategyResult, StrategyType } from '@/types/strategy';
import type { SetupGrade, SetupType, TradingSetup } from '@/types/setup';
import type {
  ScanFilters,
  ScanRequest,
  ScanResponse,
  ScanResult,
  ScanSummary,
} from '@/types/scanner';

/**
 * Result returned by the analysis source for a single symbol.
 * The scanner only needs the engine output plus the latest quote metadata.
 */
export interface SymbolAnalysis {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  output: EngineOutput;
}

/**
 * Abstraction over "analyze one symbol across timeframes".
 * Implementations may fetch market data and run the analysis engine, or in
 * tests return canned results.
 */
export interface SymbolAnalysisSource {
  analyze(
    symbol: string,
    timeframe: ScanRequest['timeframe'],
    strategies: StrategyType[]
  ): Promise<SymbolAnalysis>;
}

export interface ScannerConfig {
  source: SymbolAnalysisSource;
  defaultConcurrency?: number;
}

const DEFAULT_CONCURRENCY = 4;

const ALL_GRADES: SetupGrade[] = ['EXCELLENT', 'STRONG', 'MODERATE', 'WEAK', 'REJECT'];
const ALL_SETUP_TYPES: SetupType[] = [
  'BREAKOUT',
  'PULLBACK',
  'REVERSAL',
  'SUPPORT_BOUNCE',
  'RESISTANCE_REJECTION',
];

function emptyGradeCounts(): Record<SetupGrade, number> {
  return ALL_GRADES.reduce(
    (acc, grade) => {
      acc[grade] = 0;
      return acc;
    },
    {} as Record<SetupGrade, number>
  );
}

function emptySetupTypeCounts(): Record<SetupType, number> {
  return ALL_SETUP_TYPES.reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<SetupType, number>
  );
}

export class ScannerService {
  private readonly source: SymbolAnalysisSource;
  private readonly defaultConcurrency: number;

  constructor(config: ScannerConfig) {
    this.source = config.source;
    this.defaultConcurrency = config.defaultConcurrency ?? DEFAULT_CONCURRENCY;
  }

  /**
   * Main entry point: scan all symbols, rank, filter, and summarize.
   */
  async scanSymbols(input: ScanRequest): Promise<ScanResponse> {
    const startedAt = Date.now();
    const concurrency = Math.max(1, input.maxConcurrency ?? this.defaultConcurrency);

    const allResults = await this.scanAll(input, concurrency);

    const filtered = filterResults(allResults, input);
    filtered.sort((a, b) => b.score - a.score);

    const summary = buildSummary(allResults, filtered);

    return {
      results: filtered,
      summary,
      startedAt,
      completedAt: Date.now(),
    };
  }

  /**
   * Run the analysis source for every symbol with bounded concurrency.
   * A single symbol failure is captured into a ScanResult with `error` set
   * and never aborts the rest of the batch.
   */
  private async scanAll(input: ScanRequest, concurrency: number): Promise<ScanResult[]> {
    const results: ScanResult[] = new Array(input.symbols.length);
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < input.symbols.length) {
        const index = cursor;
        cursor += 1;
        const symbol = input.symbols[index];
        if (!symbol) {
          continue;
        }

        try {
          const analysis = await this.source.analyze(symbol, input.timeframe, input.strategies);
          results[index] = toScanResult(analysis);
        } catch (error) {
          results[index] = {
            symbol,
            name: symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            setup: null,
            score: 0,
            grade: 'REJECT',
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : 'Analysis failed',
          };
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, input.symbols.length) }, worker);
    await Promise.all(workers);

    return results.filter((r): r is ScanResult => r !== undefined);
  }
}

/**
 * Convert an engine analysis result into a flat ScanResult.
 */
export function toScanResult(analysis: SymbolAnalysis): ScanResult {
  const { output } = analysis;
  const setup: TradingSetup | null = output.bestSetup?.setup ?? null;

  return {
    symbol: analysis.symbol,
    name: analysis.name,
    price: analysis.price,
    change: analysis.change,
    changePercent: analysis.changePercent,
    setup,
    score: setup ? setup.confidenceScore : 0,
    grade: setup ? setup.grade : 'REJECT',
    timestamp: output.timestamp,
  };
}

/**
 * Apply ScanRequest-level and ScanFilters-level filtering.
 * Results that failed analysis (setup === null) are kept only if no score/
 * risk filters are set; they are filtered out whenever a numeric threshold
 * would be impossible to satisfy.
 */
export function filterResults(results: ScanResult[], input: ScanRequest): ScanResult[] {
  const filters: ScanFilters | undefined = input.filters;
  const minScore = input.minScore ?? filters?.scoreRange?.min ?? -Infinity;
  const maxScore = filters?.scoreRange?.max ?? Infinity;
  const minRR = input.minRiskReward ?? filters?.riskRewardRange?.min ?? -Infinity;
  const maxRR = filters?.riskRewardRange?.max ?? Infinity;
  const trend = filters?.trend;
  const setupTypes = filters?.setupTypes;

  return results.filter((result) => {
    // Failed analyses have no setup to evaluate against numeric filters.
    if (!result.setup) {
      return minScore <= 0 && minRR <= 0 && !trend && !setupTypes?.length;
    }

    const { score, grade, setup } = result;
    void grade;

    if (score < minScore || score > maxScore) {
      return false;
    }

    if (setup.riskReward < minRR || setup.riskReward > maxRR) {
      return false;
    }

    if (trend && trend !== 'ALL' && setup.trend.direction !== trend) {
      return false;
    }

    if (setupTypes && setupTypes.length > 0 && !setupTypes.includes(setup.setupType)) {
      return false;
    }

    return true;
  });
}

/**
 * Build summary statistics from the full scan and the filtered/ranked set.
 */
export function buildSummary(allResults: ScanResult[], ranked: ScanResult[]): ScanSummary {
  const successful = allResults.filter((r) => !r.error && r.setup).length;
  const failed = allResults.filter((r) => Boolean(r.error)).length;

  const byGrade = emptyGradeCounts();
  const bySetupType = emptySetupTypeCounts();

  let scoreSum = 0;
  let rrSum = 0;
  let rrCount = 0;

  for (const result of ranked) {
    byGrade[result.grade] += 1;
    if (result.setup) {
      bySetupType[result.setup.setupType] += 1;
      scoreSum += result.score;
      rrSum += result.setup.riskReward;
      rrCount += 1;
    }
  }

  const topOpportunities = ranked.slice(0, 10);

  return {
    totalScanned: allResults.length,
    successful,
    failed,
    byGrade,
    bySetupType,
    topOpportunities,
    avgScore: rrCount > 0 ? Math.round((scoreSum / rrCount) * 100) / 100 : 0,
    avgRiskReward: rrCount > 0 ? Math.round((rrSum / rrCount) * 100) / 100 : 0,
  };
}

// Re-export for consumers that build a fake source in tests.
export type { EngineOutput, AnalysisContext, StrategyResult };
