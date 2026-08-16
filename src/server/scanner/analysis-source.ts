/**
 * Real Analysis Source for Scanner
 * Wires together MarketDataProvider → AnalysisEngine (with all 4 strategies + scoring + risk)
 * to produce a SymbolAnalysis for a single symbol.
 *
 * This lives in src/server/scanner/ so the ScannerService (which has no direct
 * dependency on the analysis engine internals) can be tested with a fake source,
 * while the application wires the real source at startup.
 */
import type { Candle, MarketDataProvider, Timeframe } from '@/types';
import type { EngineInput, StrategyConfig } from '@/analysis/engine/interfaces';
import type { Strategy } from '@/analysis/engine/interfaces';
import { AnalysisEngine } from '@/analysis/engine/analysis-engine';
import { BreakoutStrategy } from '@/analysis/strategies/breakout';
import { PullbackStrategy } from '@/analysis/strategies/pullback';
import { SupportBounceStrategy } from '@/analysis/strategies/support-bounce';
import { ReversalStrategy } from '@/analysis/strategies/reversal';
import { getDefaultConfig } from '@/analysis/strategies/config';
import { createScoringEngine } from '@/analysis/scoring';
import type { StrategyType } from '@/types/strategy';
import type { SymbolAnalysis, SymbolAnalysisSource } from './scanner-service';

export interface AnalysisSourceConfig {
  provider: MarketDataProvider;
  timeframe: Timeframe;
  strategies: StrategyType[];
  strategyConfigs?: Partial<Record<StrategyType, StrategyConfig>>;
  lookbackDays?: number;
}

const DEFAULT_LOOKBACK_DAYS = 365;

/**
 * Map scanner timeframe to the three engine timeframes.
 * scanner timeframe is the "setup" timeframe; we derive higher and entry.
 */
export function resolveTimeframes(setupTimeframe: Timeframe): {
  higher: Timeframe;
  setup: Timeframe;
  entry: Timeframe;
} {
  switch (setupTimeframe) {
    case '1d':
      return { higher: '1d', setup: '1d', entry: '4h' };
    case '4h':
      return { higher: '1d', setup: '4h', entry: '1h' };
    case '1h':
      return { higher: '4h', setup: '1h', entry: '30m' };
    default:
      return { higher: '1d', setup: '4h', entry: '1h' };
  }
}

/**
 * Create a SymbolAnalysisSource backed by the real analysis engine.
 */
export function createRealAnalysisSource(config: AnalysisSourceConfig): SymbolAnalysisSource {
  const {
    provider,
    timeframe,
    strategies,
    strategyConfigs,
    lookbackDays = DEFAULT_LOOKBACK_DAYS,
  } = config;

  // Build analysis engine with all strategies registered
  const engine = buildEngine(strategies, strategyConfigs);

  return {
    async analyze(
      symbol: string,
      _scanTimeframe: Timeframe,
      _scanStrategies: StrategyType[]
    ): Promise<SymbolAnalysis> {
      // Resolve timeframes
      const tfs = resolveTimeframes(timeframe);

      // Fetch candles for all three timeframes in parallel
      const [higherCandles, setupCandles, entryCandles] = await Promise.all([
        fetchCandles(provider, symbol, tfs.higher, lookbackDays),
        fetchCandles(provider, symbol, tfs.setup, lookbackDays),
        fetchCandles(provider, symbol, tfs.entry, lookbackDays),
      ]);

      // Fetch latest quote for price/change metadata
      const quote = await provider.getLatestQuote(symbol);

      // Build engine input
      const input: EngineInput = {
        symbol,
        candles: {
          higher: higherCandles,
          setup: setupCandles,
          entry: entryCandles,
        },
        timeframes: tfs,
        config: buildMergedConfig(strategies, strategyConfigs, tfs),
      };

      // Run analysis
      const output = await engine.analyze(input);

      // Build symbol analysis
      return {
        symbol,
        name: symbol, // TODO: enrich with symbol name from a symbol registry
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        output,
      };
    },
  };
}

/**
 * Fetch candles for a symbol/timeframe going back `lookbackDays`.
 */
async function fetchCandles(
  provider: MarketDataProvider,
  symbol: string,
  tf: Timeframe,
  lookbackDays: number
): Promise<Candle[]> {
  const to = new Date();
  const from = new Date(to.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  return provider.getHistoricalCandles(symbol, tf, from, to);
}

/**
 * Build the analysis engine with all four strategies registered and the
 * scoring/risk engines injected.
 */
function buildEngine(
  strategies: StrategyType[],
  strategyConfigs?: Partial<Record<StrategyType, StrategyConfig>>
): AnalysisEngine {
  // Create scoring engine (7-factor weighted scoring)
  const scoringEngine = createScoringEngine();

  const engine = new AnalysisEngine({
    strategies,
    indicatorCalculators: new Map(),
    priceActionDetectors: new Map(),
    patternDetectors: new Map(),
    riskCalculator: {
      calculate: () => [],
    },
    scorer: {
      score: (context, result) => scoringEngine.score(context, result),
    },
    maxConcurrency: 1, // Engine itself is single-threaded per symbol
  });

  // Register strategies with their configs
  for (const type of strategies) {
    const config = mergeStrategyConfig(type, strategyConfigs);
    let strategy: Strategy;

    switch (type) {
      case 'BREAKOUT':
        strategy = new BreakoutStrategy(config);
        break;
      case 'PULLBACK':
        strategy = new PullbackStrategy(config);
        break;
      case 'SUPPORT_BOUNCE':
        strategy = new SupportBounceStrategy(config);
        break;
      case 'REVERSAL':
        strategy = new ReversalStrategy(config);
        break;
      default:
        continue;
    }

    engine.registerStrategy(strategy);
  }

  return engine;
}

/**
 * Build the merged StrategyConfig for the EngineInput.
 * The engine uses this config for its validation logic and multi-timeframe params.
 */
function buildMergedConfig(
  strategies: StrategyType[],
  strategyConfigs?: Partial<Record<StrategyType, StrategyConfig>>,
  timeframes?: { higher: Timeframe; setup: Timeframe; entry: Timeframe }
): StrategyConfig {
  // Use the first strategy's config as the base (they share most params)
  const primaryType = strategies[0] ?? 'BREAKOUT';
  const base = mergeStrategyConfig(primaryType, strategyConfigs);

  return {
    ...base,
    higherTimeframe: timeframes?.higher ?? '1d',
    setupTimeframe: timeframes?.setup ?? '4h',
    entryTimeframe: timeframes?.entry ?? '1h',
  };
}

/**
 * Merge user-provided config with defaults for a strategy type.
 */
function mergeStrategyConfig(
  type: StrategyType,
  strategyConfigs?: Partial<Record<StrategyType, StrategyConfig>>
): StrategyConfig {
  const defaults = getDefaultConfig(type);
  const user = strategyConfigs?.[type];
  return user ? { ...defaults, ...user } : defaults;
}
