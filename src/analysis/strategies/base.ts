/**
 * Strategy Base Class
 * Abstract base class for all trading strategies
 */
import type {
  StrategyConfig,
  StrategyValidationResult,
  AnalysisContext,
  StrategyResult,
  StrategyType,
} from '@/types/strategy';
import type { Strategy as StrategyInterface } from '../engine/interfaces';
import type { PriceZone } from '@/types/price-action';
import type { CandlestickPattern } from '@/types/candlesticks';

export abstract class BaseStrategy implements StrategyInterface {
  public readonly name: StrategyType;
  public readonly config: StrategyConfig;

  constructor(name: StrategyType, config: StrategyConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * Analyze the context and return a trading setup if conditions are met
   * Must be implemented by each strategy
   */
  abstract analyze(context: AnalysisContext): StrategyResult | null;

  /**
   * Validate strategy configuration
   */
  validate(config: StrategyConfig): StrategyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Universal validation
    if (config.minScore < 0 || config.minScore > 100) {
      errors.push('minScore must be between 0 and 100');
    }

    if (config.minRiskReward <= 0) {
      errors.push('minRiskReward must be positive');
    }

    // EMA validation
    if (config.emaFast <= 0 || config.emaSlow <= 0 || config.emaTrend <= 0) {
      errors.push('EMA periods must be positive');
    }

    if (config.emaFast >= config.emaSlow) {
      warnings.push('emaFast should be less than emaSlow');
    }

    if (config.emaSlow >= config.emaTrend) {
      warnings.push('emaSlow should be less than emaTrend');
    }

    // RSI validation
    if (config.rsiPeriod <= 0) {
      errors.push('rsiPeriod must be positive');
    }

    if (config.rsiMin !== undefined && (config.rsiMin < 0 || config.rsiMin > 100)) {
      errors.push('rsiMin must be between 0 and 100');
    }

    if (config.rsiMax !== undefined && (config.rsiMax < 0 || config.rsiMax > 100)) {
      errors.push('rsiMax must be between 0 and 100');
    }

    if (
      config.rsiMin !== undefined &&
      config.rsiMax !== undefined &&
      config.rsiMin >= config.rsiMax
    ) {
      errors.push('rsiMin must be less than rsiMax');
    }

    // Volume validation
    if (config.volumePeriod <= 0) {
      errors.push('volumePeriod must be positive');
    }

    if (config.volumeMultiplier !== undefined && config.volumeMultiplier <= 0) {
      errors.push('volumeMultiplier must be positive');
    }

    // ATR validation
    if (config.atrPeriod <= 0) {
      errors.push('atrPeriod must be positive');
    }

    if (config.atrMultiplier !== undefined && config.atrMultiplier <= 0) {
      errors.push('atrMultiplier must be positive');
    }

    // Structure validation
    if (config.lookbackPeriod <= 0) {
      errors.push('lookbackPeriod must be positive');
    }

    // Multi-timeframe validation
    if (!config.higherTimeframe || !config.setupTimeframe || !config.entryTimeframe) {
      errors.push('All timeframes (higher, setup, entry) must be specified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get required indicators for this strategy
   * Override in subclasses to specify requirements
   */
  getRequiredIndicators(): string[] {
    return ['ema', 'rsi', 'macd', 'atr', 'adx', 'volume'];
  }

  /**
   * Get required price action components
   * Override in subclasses to specify requirements
   */
  getRequiredPriceAction(): string[] {
    return ['structure', 'supportZones', 'resistanceZones', 'breakouts', 'pullbacks'];
  }

  /**
   * Helper: Check if higher timeframe trend is bullish
   */
  protected isHigherTimeframeBullish(context: AnalysisContext): boolean {
    const ema = context.indicators.higher.ema;
    return ema.ema20 > ema.ema50 && ema.ema50 > ema.ema200;
  }

  /**
   * Helper: Check if higher timeframe trend is bearish
   */
  protected isHigherTimeframeBearish(context: AnalysisContext): boolean {
    const ema = context.indicators.higher.ema;
    return ema.ema20 < ema.ema50 && ema.ema50 < ema.ema200;
  }

  /**
   * Helper: Check RSI condition
   */
  protected checkRSI(context: AnalysisContext, timeframe: 'higher' | 'setup' | 'entry'): boolean {
    const rsi = context.indicators[timeframe].rsi.rsi;
    const { rsiMin, rsiMax } = this.config;

    if (rsiMin !== undefined && rsi < rsiMin) return false;
    if (rsiMax !== undefined && rsi > rsiMax) return false;
    return true;
  }

  /**
   * Helper: Check volume condition
   */
  protected checkVolume(
    context: AnalysisContext,
    timeframe: 'higher' | 'setup' | 'entry'
  ): boolean {
    const volume = context.indicators[timeframe].volume;
    const { volumeMultiplier } = this.config;

    if (volumeMultiplier === undefined) return true;
    return volume.relativeVolume >= volumeMultiplier;
  }

  /**
   * Helper: Check EMA alignment
   */
  protected checkEMAAlignment(
    context: AnalysisContext,
    timeframe: 'higher' | 'setup' | 'entry'
  ): boolean {
    const { requireEmaAlignment } = this.config;
    if (!requireEmaAlignment) return true;

    const ema = context.indicators[timeframe].ema;
    return ema.ema20 > ema.ema50 && ema.ema50 > ema.ema200;
  }

  /**
   * Helper: Check if price is near a support zone
   */
  protected isNearSupport(
    price: number,
    supportZones: PriceZone[],
    thresholdPercent: number = 1.5
  ): { zone: PriceZone | null; distance: number } {
    let bestZone: PriceZone | null = null;
    let minDistance = Infinity;

    for (const zone of supportZones) {
      const distance = (Math.abs(price - zone.center) / zone.center) * 100;
      if (distance < minDistance && distance <= thresholdPercent) {
        minDistance = distance;
        bestZone = zone;
      }
    }

    return { zone: bestZone, distance: minDistance };
  }

  /**
   * Helper: Check if price is near a resistance zone
   */
  protected isNearResistance(
    price: number,
    resistanceZones: PriceZone[],
    thresholdPercent: number = 1.5
  ): { zone: PriceZone | null; distance: number } {
    let bestZone: PriceZone | null = null;
    let minDistance = Infinity;

    for (const zone of resistanceZones) {
      const distance = (Math.abs(price - zone.center) / zone.center) * 100;
      if (distance < minDistance && distance <= thresholdPercent) {
        minDistance = distance;
        bestZone = zone;
      }
    }

    return { zone: bestZone, distance: minDistance };
  }

  /**
   * Helper: Check for bullish candlestick confirmation
   */
  protected hasBullishCandlestick(
    patterns: CandlestickPattern[],
    minConfidence: number = 50
  ): CandlestickPattern | null {
    return patterns.find((p) => p.direction === 'BULLISH' && p.confidence >= minConfidence) ?? null;
  }

  /**
   * Helper: Check for bearish candlestick confirmation
   */
  protected hasBearishCandlestick(
    patterns: CandlestickPattern[],
    minConfidence: number = 50
  ): CandlestickPattern | null {
    return patterns.find((p) => p.direction === 'BEARISH' && p.confidence >= minConfidence) ?? null;
  }
}
