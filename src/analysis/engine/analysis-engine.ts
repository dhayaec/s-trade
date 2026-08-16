/**
 * Analysis Engine
 * Orchestrates the full analysis pipeline:
 * Data → Indicators → Price Action → Patterns → Strategies → Risk → Score
 */
import type { Candle } from '@/types';
import type {
  AnalysisContext,
  StrategyResult,
  StrategyType,
  IndicatorBundle,
  PriceActionBundle,
} from '@/types/strategy';
import type { EngineInput, EngineOutput, Strategy, AnalysisEngineConfig } from './interfaces';
import type { PreviousLevelsValue } from '@/types/indicators';
import type {
  PriceZone,
  Breakout,
  Pullback,
  ConsolidationRange,
  MarketStructure,
} from '@/types/price-action';
import { getMarketRegime } from '@/analysis/indicators/market-regime';
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateADX,
  calculateVolume,
} from '@/analysis/indicators';
import {
  findSwingPoints,
  detectMarketStructure,
  findSupportResistanceZones,
} from '@/analysis/price-action';
import { detectCandlestickPatterns } from '@/analysis/candlesticks';
import { calculateCPR } from '@/analysis/pivots/cpr';

export class AnalysisEngine {
  private config: AnalysisEngineConfig;
  private strategies: Map<StrategyType, Strategy> = new Map();

  constructor(config: AnalysisEngineConfig) {
    this.config = {
      maxConcurrency: 4,
      ...config,
    };
  }

  /**
   * Register a strategy
   */
  registerStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get registered strategy
   */
  getStrategy(name: StrategyType): Strategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Run full analysis for a symbol across multiple timeframes
   */
  async analyze(input: EngineInput): Promise<EngineOutput> {
    const warnings: string[] = [];
    const timestamp = Date.now();

    // Validate inputs
    if (!this.validateInput(input, warnings)) {
      return this.createEmptyOutput(input.symbol, timestamp, warnings);
    }

    // Calculate indicators for all timeframes
    const indicators = this.calculateAllIndicators(input);

    // Detect price action for all timeframes
    const priceAction = this.detectAllPriceAction(input);

    // Detect candlestick patterns for all timeframes
    const patterns = this.detectAllPatterns(input);

    // Calculate CPR for all timeframes
    const cpr = this.calculateAllCPR(input);

    // Determine market regime from higher timeframe
    const marketRegime = getMarketRegime(input.candles.higher);

    // Current price from entry timeframe
    const currentPrice = input.candles.entry[input.candles.entry.length - 1]?.close ?? 0;
    const currentTimestamp =
      input.candles.entry[input.candles.entry.length - 1]?.timestamp ?? timestamp;

    // Build analysis context
    const context: AnalysisContext = {
      symbol: input.symbol,
      candles: input.candles,
      indicators,
      priceAction,
      patterns,
      cpr,
      marketRegime,
      currentPrice,
      currentTimestamp,
    };

    // Run all registered strategies
    const strategyResults = new Map<StrategyType, StrategyResult>();
    let bestSetup: StrategyResult | null = null;
    let bestScore = -1;
    let activeStrategy: StrategyType | null = null;

    for (const strategyType of this.config.strategies) {
      const strategy = this.strategies.get(strategyType);
      if (!strategy) {
        warnings.push(`Strategy not registered: ${strategyType}`);
        continue;
      }

      try {
        const result = strategy.analyze(context);
        if (result && result.setup) {
          strategyResults.set(strategyType, result);

          // Track best setup by score
          const score = this.config.scorer?.score(context, result) ?? 0;
          if (score > bestScore) {
            bestScore = score;
            bestSetup = result;
            activeStrategy = strategyType;
          }
        }
      } catch (error) {
        warnings.push(
          `Strategy ${strategyType} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      symbol: input.symbol,
      timestamp,
      context,
      strategyResults,
      activeStrategy,
      bestSetup,
      warnings,
    };
  }

  /**
   * Calculate all indicators for all timeframes
   */
  private calculateAllIndicators(input: EngineInput): AnalysisContext['indicators'] {
    const calcIndicators = (candles: Candle[]): IndicatorBundle => {
      const ema = calculateEMA(candles);
      const rsi = calculateRSI(candles);
      const macd = calculateMACD(candles);
      const atr = calculateATR(candles);
      const adx = calculateADX(candles);
      const volume = calculateVolume(candles);
      const prevLevels = calculatePreviousLevels(candles);

      return { ema, rsi, macd, atr, adx, volume, prevLevels };
    };

    return {
      higher: calcIndicators(input.candles.higher),
      setup: calcIndicators(input.candles.setup),
      entry: calcIndicators(input.candles.entry),
    };
  }

  /**
   * Detect all price action for all timeframes
   */
  private detectAllPriceAction(input: EngineInput): AnalysisContext['priceAction'] {
    const detectPA = (candles: Candle[], lookback: number): PriceActionBundle => {
      const swings = findSwingPoints(candles, lookback);
      const structure = detectMarketStructure(candles, swings);
      const { supportZones, resistanceZones } = findSupportResistanceZones(candles, swings);
      const breakouts = detectBreakouts(candles, resistanceZones);
      const pullbacks = detectPullbacks(candles, supportZones, structure);
      const consolidation = detectConsolidation(candles);

      return {
        structure,
        supportZones,
        resistanceZones,
        breakouts,
        pullbacks,
        consolidation,
      };
    };

    const lookback = input.config.lookbackPeriod;

    return {
      higher: detectPA(input.candles.higher, lookback),
      setup: detectPA(input.candles.setup, lookback),
      entry: detectPA(input.candles.entry, lookback),
    };
  }

  /**
   * Detect all candlestick patterns for all timeframes
   */
  private detectAllPatterns(input: EngineInput): AnalysisContext['patterns'] {
    return {
      higher: detectCandlestickPatterns(input.candles.higher),
      setup: detectCandlestickPatterns(input.candles.setup),
      entry: detectCandlestickPatterns(input.candles.entry),
    };
  }

  /**
   * Calculate CPR for all timeframes
   */
  private calculateAllCPR(input: EngineInput): AnalysisContext['cpr'] {
    return {
      higher: calculateCPR(input.candles.higher),
      setup: calculateCPR(input.candles.setup),
      entry: calculateCPR(input.candles.entry),
    };
  }

  /**
   * Validate engine input
   */
  private validateInput(input: EngineInput, warnings: string[]): boolean {
    if (!input.symbol) {
      warnings.push('Symbol is required');
      return false;
    }

    if (input.candles.higher.length < 50) {
      warnings.push('Insufficient higher timeframe data (need 50+ candles)');
    }

    if (input.candles.setup.length < 50) {
      warnings.push('Insufficient setup timeframe data (need 50+ candles)');
    }

    if (input.candles.entry.length < 50) {
      warnings.push('Insufficient entry timeframe data (need 50+ candles)');
    }

    return true;
  }

  /**
   * Create empty output for invalid input
   */
  private createEmptyOutput(symbol: string, timestamp: number, warnings: string[]): EngineOutput {
    return {
      symbol,
      timestamp,
      context: {} as AnalysisContext,
      strategyResults: new Map(),
      activeStrategy: null,
      bestSetup: null,
      warnings,
    };
  }
}

// Helper functions (stubs - will be implemented in their respective modules)

function calculatePreviousLevels(candles: Candle[]): PreviousLevelsValue {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  return {
    prevHigh: prev?.high ?? last?.high ?? 0,
    prevLow: prev?.low ?? last?.low ?? 0,
    prevClose: prev?.close ?? last?.close ?? 0,
    prevOpen: prev?.open ?? last?.open ?? 0,
    prevVolume: prev?.volume ?? last?.volume ?? 0,
  };
}

function detectBreakouts(_candles: Candle[], _resistanceZones: PriceZone[]): Breakout[] {
  return [];
}

function detectPullbacks(
  _candles: Candle[],
  _supportZones: PriceZone[],
  _structure: MarketStructure
): Pullback[] {
  return [];
}

function detectConsolidation(_candles: Candle[]): ConsolidationRange | null {
  return null;
}
