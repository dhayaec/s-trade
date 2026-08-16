/**
 * ATR Indicator Tests
 * Real implementation from Sprint 3
 */
import { describe, it, expect } from 'vitest';
import { calculateATR } from '@/analysis/indicators';

describe('calculateATR', () => {
  it('should return default values for empty array', () => {
    const result = calculateATR([]);
    expect(result).toEqual({
      atr: 0,
      atrPercent: 0,
    });
  });

  it('should return default values for insufficient data', () => {
    const candles = [{ timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 }];
    const result = calculateATR(candles);
    expect(result).toEqual({
      atr: 0,
      atrPercent: 0,
    });
  });

  it('should calculate ATR for data with wide ranges', () => {
    // Create 30 candles with wide price ranges
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 120,
      low: 80,
      close: 100,
      volume: 1000,
    }));

    const result = calculateATR(candles);
    // True range = max(high-low, |high-prevClose|, |low-prevClose|)
    // With 40-point range consistently, ATR should be around 40
    expect(result.atr).toBeGreaterThan(30);
    expect(result.atr).toBeLessThan(50);
    expect(result.atrPercent).toBeGreaterThan(30);
  });

  it('should calculate ATR for tight ranges', () => {
    // Create 30 candles with tight price ranges
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000,
    }));

    const result = calculateATR(candles);
    // True range = max(high-low, |high-prevClose|, |low-prevClose|) = 2
    expect(result.atr).toBeGreaterThan(1);
    expect(result.atr).toBeLessThan(3);
  });

  it('should calculate ATR for trending data with gaps', () => {
    // Create 30 candles with trending price and gaps
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000,
    }));

    const result = calculateATR(candles);
    // ATR should reflect average daily range
    expect(result.atr).toBeGreaterThan(5);
    expect(result.atr).toBeLessThan(15);
  });
});
