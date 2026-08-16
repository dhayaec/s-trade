/**
 * Reversal Strategy (Conservative)
 * Detects reversal setups: downtrend + divergence + structure break + confirmation
 */
import type { AnalysisContext, StrategyResult, StrategyConfig } from '@/types/strategy';
import { BaseStrategy } from './base';

export class ReversalStrategy extends BaseStrategy {
  override readonly name = 'REVERSAL' as const;

  constructor(config: StrategyConfig) {
    super('REVERSAL', config);
  }

  override analyze(_context: AnalysisContext): StrategyResult | null {
    // TODO: Implement in Sprint 6
    return null;
  }

  override getRequiredIndicators(): string[] {
    return ['ema', 'rsi', 'macd', 'atr', 'adx', 'volume', 'prevLevels'];
  }

  override getRequiredPriceAction(): string[] {
    return ['structure', 'supportZones', 'resistanceZones', 'breakouts', 'pullbacks'];
  }
}
