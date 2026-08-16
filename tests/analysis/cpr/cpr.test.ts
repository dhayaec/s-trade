/**
 * CPR Tests
 * Note: Actual implementation in Sprint 3; current tests match Sprint 1 stubs
 */
import { describe, it, expect } from 'vitest';
import { calculateCPR, calculateCPRFromOHLC } from '@/analysis/pivots/cpr';

describe('calculateCPRFromOHLC', () => {
  it('should calculate CPR correctly from OHLC (Sprint 1 stub)', () => {
    // Previous day: High=110, Low=90, Close=100
    // Current day: Open=102
    const result = calculateCPRFromOHLC(110, 90, 100, 102);

    // Current stub implementation - Pivot = 100, BC = 100, TC = 100
    expect(result.levels.pivot).toBe(100);
    expect(result.levels.bc).toBe(100);
    expect(result.levels.tc).toBe(100);
    // Width is under cpr object
    expect(result.cpr.width).toBe(0);
    expect(result.cpr.classification).toBe('NARROW'); // widthPercent = 0 < 0.5
  });

  it('should calculate wide CPR (Sprint 1 stub)', () => {
    // Current stub implementation actually calculates widthPercent correctly
    const result2 = calculateCPRFromOHLC(115, 85, 95, 100);

    // Current stub calculates widthPercent > 1.5 -> WIDE
    expect(result2.cpr.widthPercent).toBeGreaterThan(1.5);
    expect(result2.cpr.classification).toBe('WIDE');
  });
});

describe('calculateCPR', () => {
  it('should return null for insufficient candles', () => {
    const candles = [{ timestamp: 1, open: 100, high: 110, low: 90, close: 100, volume: 1000 }];
    const result = calculateCPR(candles);
    expect(result).toBeNull();
  });

  it('should calculate CPR from candle array (Sprint 1 stub)', () => {
    const candles = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 100, volume: 1000 }, // prev day
      { timestamp: 2, open: 102, high: 112, low: 92, close: 105, volume: 1000 }, // curr day
    ];
    const result = calculateCPR(candles);

    expect(result).not.toBeNull();
    // Current stub returns basic CPR
    expect(result?.levels.pivot).toBe(100);
    expect(result?.levels.bc).toBe(100);
    expect(result?.levels.tc).toBe(100);
  });
});
