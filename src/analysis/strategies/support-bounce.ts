/**
 * Support Bounce Strategy
 * Detects support bounce setups: strong support + rejection + momentum
 */
import type { AnalysisContext, StrategyResult, StrategyConfig } from '@/types/strategy';
import { BaseStrategy } from './base';

export class SupportBounceStrategy extends BaseStrategy {
  override readonly name = 'SUPPORT_BOUNCE' as const;

  constructor(config: StrategyConfig) {
    super('SUPPORT_BOUNCE', config);
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
