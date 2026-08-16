/**
 * Breakout Strategy
 * Detects breakout setups: resistance break + volume + trend alignment
 */
import type { AnalysisContext, StrategyResult, StrategyConfig } from '@/types/strategy';
import { BaseStrategy } from './base';

export class BreakoutStrategy extends BaseStrategy {
  override readonly name = 'BREAKOUT' as const;

  constructor(config: StrategyConfig) {
    super('BREAKOUT', config);
  }

  override analyze(_context: AnalysisContext): StrategyResult | null {
    // TODO: Implement in Sprint 6
    return null;
  }

  override getRequiredIndicators(): string[] {
    return ['ema', 'rsi', 'macd', 'atr', 'adx', 'volume', 'prevLevels'];
  }

  override getRequiredPriceAction(): string[] {
    return ['structure', 'resistanceZones', 'breakouts', 'consolidation'];
  }
}
