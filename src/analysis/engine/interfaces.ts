/**
 * Analysis Engine Interfaces
 * Core types for the analysis pipeline
 */
import type { Candle, Timeframe } from '@/types';
import type {
  StrategyConfig,
  AnalysisContext,
  StrategyResult,
  StrategySignal,
  StrategyValidationResult,
  StrategyType,
} from '@/types/strategy';

// Re-export StrategyConfig for consumers
export type { StrategyConfig };

/**
 * Engine input - raw market data for multi-timeframe analysis
 */
export interface EngineInput {
  symbol: string;
  candles: {
    higher: Candle[]; // e.g., 1D
    setup: Candle[]; // e.g., 4H
    entry: Candle[]; // e.g., 1H
  };
  timeframes: {
    higher: Timeframe;
    setup: Timeframe;
    entry: Timeframe;
  };
  config: StrategyConfig;
}

/**
 * Engine output - complete analysis result
 */
export interface EngineOutput {
  symbol: string;
  timestamp: number;
  context: AnalysisContext;
  strategyResults: Map<StrategyType, StrategyResult>;
  activeStrategy: StrategyType | null;
  bestSetup: StrategyResult | null;
  warnings: string[];
}

/**
 * Strategy interface - each strategy implements this
 */
export interface Strategy {
  readonly name: StrategyType;
  readonly config: StrategyConfig;

  /**
   * Analyze the context and return a trading setup if conditions are met
   */
  analyze(context: AnalysisContext): StrategyResult | null;

  /**
   * Validate strategy configuration
   */
  validate(config: StrategyConfig): StrategyValidationResult;

  /**
   * Get required indicators for this strategy
   */
  getRequiredIndicators(): string[];

  /**
   * Get required price action components
   */
  getRequiredPriceAction(): string[];
}

/**
 * Indicator calculator interface
 */
export interface IndicatorCalculator {
  readonly name: string;
  calculate(candles: Candle[], ...args: unknown[]): unknown;
}

/**
 * Price action detector interface
 */
export interface PriceActionDetector {
  readonly name: string;
  detect(candles: Candle[], ...args: unknown[]): unknown;
}

/**
 * Candlestick pattern detector interface
 */
export interface PatternDetector {
  readonly name: string;
  detect(candles: Candle[], ...args: unknown[]): unknown;
}

/**
 * Risk calculator interface
 */
export interface RiskCalculator {
  calculate(context: AnalysisContext, setup: StrategyResult): StrategySignal[];
}

/**
 * Scorer interface
 */
export interface Scorer {
  score(context: AnalysisContext, setup: StrategyResult): number;
}

/**
 * Analysis engine configuration
 */
export interface AnalysisEngineConfig {
  strategies: StrategyType[];
  indicatorCalculators: Map<string, IndicatorCalculator>;
  priceActionDetectors: Map<string, PriceActionDetector>;
  patternDetectors: Map<string, PatternDetector>;
  riskCalculator: RiskCalculator;
  scorer: Scorer;
  maxConcurrency?: number;
}
