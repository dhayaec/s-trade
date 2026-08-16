/**
 * Pullback Strategy
 * Detects pullback setups: uptrend + pullback to support/EMA + bullish candle
 */
import type { AnalysisContext, StrategyResult, StrategyConfig } from '@/types/strategy';
import { BaseStrategy } from './base';

export class PullbackStrategy extends BaseStrategy {
  override readonly name = 'PULLBACK' as const;

  constructor(config: StrategyConfig) {
    super('PULLBACK', config);
  }

  override analyze(_context: AnalysisContext): StrategyResult | null {
    // TODO: Implement in Sprint 6
    return null;
  }

  override getRequiredIndicators(): string[] {
    return ['ema', 'rsi', 'macd', 'atr', 'adx', 'volume', 'prevLevels'];
  }

  override getRequiredPriceAction(): string[] {
    return ['structure', 'supportZones', 'pullbacks', 'consolidation'];
  }
}
