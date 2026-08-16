/**
 * EMA Indicator Tests
 * Real implementation from Sprint 3
 */
import { describe, it, expect } from 'vitest';
import { calculateEMA } from '@/analysis/indicators';

describe('calculateEMA', () => {
  it('should return default values for empty array', () => {
    const result = calculateEMA([]);
    expect(result).toEqual({
      ema20: 0,
      ema50: 0,
      ema100: 0,
      ema200: 0,
    });
  });

  it('should return default values for insufficient data', () => {
    const candles = [
      { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: 2, open: 102, high: 107, low: 97, close: 104, volume: 1000 },
    ];
    const result = calculateEMA(candles);
    expect(result).toEqual({
      ema20: 0,
      ema50: 0,
      ema100: 0,
      ema200: 0,
    });
  });

  it('should calculate EMA for sufficient data', () => {
    // Create 250 candles with known values, linear trend
    const candles = Array.from({ length: 250 }, (_, i) => ({
      timestamp: i,
      open: 100 + i * 0.1,
      high: 105 + i * 0.1,
      low: 95 + i * 0.1,
      close: 102 + i * 0.1,
      volume: 1000,
    }));

    const result = calculateEMA(candles);

    // EMA20 should be near the closing value after 250 candles
    expect(result.ema20).toBeGreaterThan(100);
    expect(result.ema20).toBeLessThan(130);
    // EMAs should be increasing with the trend
    expect(result.ema20).toBeGreaterThan(result.ema50);
    expect(result.ema50).toBeGreaterThan(result.ema100);
    expect(result.ema100).toBeGreaterThan(result.ema200);
  });

  it('should calculate EMA values close to final close', () => {
    // Stable price - EMA should converge to the price
    const candles = Array.from({ length: 250 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }));

    const result = calculateEMA(candles);
    expect(Math.abs(result.ema20 - 100)).toBeLessThan(1);
    expect(Math.abs(result.ema50 - 100)).toBeLessThan(1);
    expect(Math.abs(result.ema200 - 100)).toBeLessThan(1);
  });
});
