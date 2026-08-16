/**
 * Multi-Timeframe Analysis Coordinator
 * Coordinates analysis across 1D/4H/1H timeframes per PLAN.md §23
 */
import type { Candle, Timeframe } from '@/types';
import type { EngineInput, EngineOutput, StrategyConfig } from './interfaces';
import type { AnalysisEngine } from './analysis-engine';

export interface TimeframeConfig {
  higher: Timeframe; // '1d' - trend filter
  setup: Timeframe; // '4h' - setup detection
  entry: Timeframe; // '1h' - entry refinement
}

/**
 * Default timeframe configuration for swing trading
 */
export const DEFAULT_TIMEFRAME_CONFIG: TimeframeConfig = {
  higher: '1d',
  setup: '4h',
  entry: '1h',
};

/**
 * Minimum candles required per timeframe
 */
export const MIN_CANDLES_PER_TIMEFRAME: Record<Timeframe, number> = {
  '1d': 250, // ~1 year
  '4h': 180, // ~30 days
  '1h': 200, // ~8 days
  '30m': 400, // ~8 days
  '15m': 800, // ~8 days
};

/**
 * Coordinate multi-timeframe analysis
 * Ensures proper alignment and validation across timeframes
 */
export class MultiTimeframeCoordinator {
  private engine: AnalysisEngine;
  private timeframeConfig: TimeframeConfig;

  constructor(engine: AnalysisEngine, timeframeConfig: TimeframeConfig = DEFAULT_TIMEFRAME_CONFIG) {
    this.engine = engine;
    this.timeframeConfig = timeframeConfig;
  }

  /**
   * Prepare engine input from raw candles across timeframes
   */
  prepareEngineInput(
    symbol: string,
    candlesByTimeframe: Record<Timeframe, Candle[]>,
    config: StrategyConfig
  ): EngineInput {
    return {
      symbol,
      candles: {
        higher: candlesByTimeframe[this.timeframeConfig.higher] ?? [],
        setup: candlesByTimeframe[this.timeframeConfig.setup] ?? [],
        entry: candlesByTimeframe[this.timeframeConfig.entry] ?? [],
      },
      timeframes: this.timeframeConfig,
      config,
    };
  }

  /**
   * Validate that all required timeframes have sufficient data
   */
  validateData(candlesByTimeframe: Record<Timeframe, Candle[]>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [tf, minCount] of Object.entries(MIN_CANDLES_PER_TIMEFRAME)) {
      const candles = candlesByTimeframe[tf as Timeframe];
      if (!candles || candles.length < minCount) {
        errors.push(`Insufficient ${tf} data: ${candles?.length ?? 0} candles (need ${minCount}+)`);
      }
    }

    // Check time alignment - latest candles should be close in time
    const higherLatest =
      candlesByTimeframe[this.timeframeConfig.higher]?.[
        candlesByTimeframe[this.timeframeConfig.higher].length - 1
      ];
    const setupLatest =
      candlesByTimeframe[this.timeframeConfig.setup]?.[
        candlesByTimeframe[this.timeframeConfig.setup].length - 1
      ];
    const entryLatest =
      candlesByTimeframe[this.timeframeConfig.entry]?.[
        candlesByTimeframe[this.timeframeConfig.entry].length - 1
      ];

    if (higherLatest && setupLatest && entryLatest) {
      const maxTimeDiff = 4 * 60 * 60 * 1000; // 4 hours in ms
      const diff1 = Math.abs(higherLatest.timestamp - setupLatest.timestamp);
      const diff2 = Math.abs(setupLatest.timestamp - entryLatest.timestamp);

      if (diff1 > maxTimeDiff) {
        errors.push('Higher and setup timeframes are not time-aligned');
      }
      if (diff2 > maxTimeDiff) {
        errors.push('Setup and entry timeframes are not time-aligned');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Run multi-timeframe analysis
   */
  async analyze(
    symbol: string,
    candlesByTimeframe: Record<Timeframe, Candle[]>,
    config: StrategyConfig
  ): Promise<EngineOutput> {
    const validation = this.validateData(candlesByTimeframe);
    if (!validation.valid) {
      return this.engine.analyze({
        symbol,
        candles: {
          higher: candlesByTimeframe[this.timeframeConfig.higher] ?? [],
          setup: candlesByTimeframe[this.timeframeConfig.setup] ?? [],
          entry: candlesByTimeframe[this.timeframeConfig.entry] ?? [],
        },
        timeframes: this.timeframeConfig,
        config,
      });
    }

    const input = this.prepareEngineInput(symbol, candlesByTimeframe, config);
    return this.engine.analyze(input);
  }

  /**
   * Get timeframe configuration
   */
  getTimeframeConfig(): TimeframeConfig {
    return this.timeframeConfig;
  }
}

/**
 * Timeframe alignment utilities
 */
export function alignTimeframes(
  candlesByTimeframe: Record<Timeframe, Candle[]>,
  baseTimeframe: Timeframe
): Record<Timeframe, Candle[]> {
  const baseCandles = candlesByTimeframe[baseTimeframe];
  if (!baseCandles || baseCandles.length === 0) {
    return candlesByTimeframe;
  }

  const baseLatest = baseCandles[baseCandles.length - 1]?.timestamp ?? 0;
  const aligned: Record<Timeframe, Candle[]> = { ...candlesByTimeframe };

  for (const [tf, candles] of Object.entries(candlesByTimeframe)) {
    if (tf === baseTimeframe) continue;
    aligned[tf as Timeframe] = candles.filter(
      (c) => c.timestamp <= baseLatest + getTimeframeMs(tf as Timeframe)
    );
  }

  return aligned;
}

function getTimeframeMs(tf: Timeframe): number {
  switch (tf) {
    case '1d':
      return 24 * 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}
