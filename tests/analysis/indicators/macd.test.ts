/**
 * MACD Indicator Tests
 * Real implementation from Sprint 3
 */
import { describe, it, expect } from 'vitest';
import { calculateMACD } from '@/analysis/indicators';

describe('calculateMACD', () => {
  it('should return default values for empty array', () => {
    const result = calculateMACD([]);
    expect(result).toEqual({
      macd: 0,
      signal: 0,
      histogram: 0,
      trend: 'NEUTRAL',
    });
  });

  it('should return default values for insufficient data', () => {
    const candles = [
      { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: 2, open: 102, high: 107, low: 97, close: 104, volume: 1000 },
    ];
    const result = calculateMACD(candles);
    expect(result).toEqual({
      macd: 0,
      signal: 0,
      histogram: 0,
      trend: 'NEUTRAL',
    });
  });

  it('should calculate MACD for trending up data', () => {
    // Create 50 candles with strong uptrend
    const candles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 100 + i,
      volume: 1000,
    }));

    const result = calculateMACD(candles);
    expect(result.macd).toBeGreaterThan(result.signal);
    expect(result.histogram).toBeGreaterThan(0);
    expect(result.trend).toBe('BULLISH');
  });

  it('should calculate MACD for trending down data', () => {
    // Create 50 candles with strong downtrend
    const candles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 150 - i,
      high: 155 - i,
      low: 145 - i,
      close: 150 - i,
      volume: 1000,
    }));

    const result = calculateMACD(candles);
    expect(result.macd).toBeLessThan(result.signal);
    expect(result.histogram).toBeLessThan(0);
    expect(result.trend).toBe('BEARISH');
  });

  it('should calculate MACD for sideways data', () => {
    // Create 50 candles with sideways movement
    const candles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100 + Math.sin(i * 0.2) * 5,
      volume: 1000,
    }));

    const result = calculateMACD(candles);
    // MACD and signal should be close to zero
    expect(Math.abs(result.macd)).toBeLessThan(5);
    expect(Math.abs(result.signal)).toBeLessThan(5);
  });
});
