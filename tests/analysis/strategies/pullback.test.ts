/**
 * Pullback Strategy Tests
 */
import { describe, it, expect } from 'vitest';
import { PullbackStrategy } from '@/analysis/strategies/pullback';
import { DEFAULT_STRATEGY_CONFIGS } from '@/analysis/strategies/config';
import type { AnalysisContext } from '@/types/strategy';

describe('PullbackStrategy', () => {
  const config = DEFAULT_STRATEGY_CONFIGS.PULLBACK;
  const strategy = new PullbackStrategy(config);

  it('should have correct name', () => {
    expect(strategy.name).toBe('PULLBACK');
  });

  it('should have correct config', () => {
    expect(strategy.config).toBe(config);
  });

  it('should return null for empty context', () => {
    const context = {} as AnalysisContext;
    const result = strategy.analyze(context);
    expect(result).toBeNull();
  });

  it('should require correct indicators', () => {
    const indicators = strategy.getRequiredIndicators();
    expect(indicators).toContain('ema');
    expect(indicators).toContain('rsi');
    expect(indicators).toContain('macd');
    expect(indicators).toContain('adx');
    expect(indicators).toContain('volume');
    expect(indicators).toContain('prevLevels');
  });

  it('should require correct price action', () => {
    const priceAction = strategy.getRequiredPriceAction();
    expect(priceAction).toContain('structure');
    expect(priceAction).toContain('supportZones');
    expect(priceAction).toContain('pullbacks');
    expect(priceAction).toContain('consolidation');
  });

  it('should validate config without errors', () => {
    const validation = strategy.validate(config);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
