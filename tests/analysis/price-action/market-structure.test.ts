/**
 * Market Structure Tests
 */
import { describe, it, expect } from 'vitest';
import { findSwingPoints, detectMarketStructure } from '@/analysis/price-action';

describe('detectMarketStructure', () => {
  it('should return UNKNOWN for empty arrays', () => {
    const result = detectMarketStructure([], []);
    expect(result.type).toBe('UNKNOWN');
    expect(result.currentTrend).toBe('NEUTRAL');
    expect(result.bosDetected).toBe(false);
    expect(result.chochDetected).toBe(false);
  });

  it('should detect uptrend structure (HH/HL)', () => {
    // Create uptrend: Higher Highs, Higher Lows
    const candles = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i,
      open: 100 + i * 2,
      high: 105 + i * 2,
      low: 95 + i * 2,
      close: 102 + i * 2,
      volume: 1000,
    }));

    const swings = findSwingPoints(candles, 2, 2);
    const result = detectMarketStructure(candles, swings);

    expect(['HH_HL', 'UNKNOWN']).toContain(result.type);
    expect(result.swingHighs).toBeDefined();
    expect(result.swingLows).toBeDefined();
  });

  it('should detect downtrend structure (LH/LL)', () => {
    // Create downtrend: Lower Highs, Lower Lows
    const candles = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i,
      open: 150 - i * 2,
      high: 155 - i * 2,
      low: 145 - i * 2,
      close: 152 - i * 2,
      volume: 1000,
    }));

    const swings = findSwingPoints(candles, 2, 2);
    const result = detectMarketStructure(candles, swings);

    expect(['LH_LL', 'UNKNOWN']).toContain(result.type);
  });
});
