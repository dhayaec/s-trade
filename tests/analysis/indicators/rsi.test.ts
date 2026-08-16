/**
 * RSI Indicator Tests
 * Real implementation from Sprint 3
 */
import { describe, it, expect } from 'vitest';
import { calculateRSI } from '@/analysis/indicators';

describe('calculateRSI', () => {
  it('should return neutral for empty array', () => {
    const result = calculateRSI([]);
    expect(result).toEqual({
      rsi: 50,
      signal: 'NEUTRAL',
    });
  });

  it('should return neutral for insufficient data', () => {
    const candles = [{ timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 }];
    const result = calculateRSI(candles);
    expect(result).toEqual({
      rsi: 50,
      signal: 'NEUTRAL',
    });
  });

  it('should return overbought for sustained upward movement', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 110,
      low: 100,
      close: 100 + i * 2, // Consistently rising
      volume: 1000,
    }));

    const result = calculateRSI(candles);
    expect(result.rsi).toBeGreaterThan(70);
    expect(result.signal).toBe('OVERBOUGHT');
  });

  it('should return oversold for sustained downward movement', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 100,
      low: 90,
      close: 100 - i * 2, // Consistently falling
      volume: 1000,
    }));

    const result = calculateRSI(candles);
    expect(result.rsi).toBeLessThan(30);
    expect(result.signal).toBe('OVERSOLD');
  });

  it('should return neutral for oscillating price', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100 + Math.sin(i * 0.5) * 5,
      volume: 1000,
    }));

    const result = calculateRSI(candles);
    expect(result.rsi).toBeGreaterThan(20);
    expect(result.rsi).toBeLessThan(80);
    expect(result.signal).toBe('NEUTRAL');
  });

  it('should return 100 for flat gains (no losses)', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1000,
    }));

    const result = calculateRSI(candles);
    expect(result.rsi).toBeCloseTo(100, 0);
    expect(result.signal).toBe('OVERBOUGHT');
  });
});
