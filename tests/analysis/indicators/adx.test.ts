/**
 * ADX Indicator Tests
 * Real implementation from Sprint 3
 */
import { describe, it, expect } from 'vitest';
import { calculateADX } from '@/analysis/indicators';

describe('calculateADX', () => {
  it('should return default values for empty array', () => {
    const result = calculateADX([]);
    expect(result).toEqual({
      adx: 0,
      plusDI: 0,
      minusDI: 0,
      trendStrength: 'NONE',
      trendDirection: 'NEUTRAL',
    });
  });

  it('should return default values for insufficient data', () => {
    const candles = [{ timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 }];
    const result = calculateADX(candles);
    expect(result).toEqual({
      adx: 0,
      plusDI: 0,
      minusDI: 0,
      trendStrength: 'NONE',
      trendDirection: 'NEUTRAL',
    });
  });

  it('should calculate ADX for strong uptrend', () => {
    // Create 50 candles with strong uptrend
    const candles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 100 + i,
      high: 105 + i,
      low: 98 + i,
      close: 102 + i,
      volume: 1000,
    }));

    const result = calculateADX(candles);
    expect(result.adx).toBeGreaterThan(25);
    expect(result.trendStrength).toBe('STRONG');
    expect(result.trendDirection).toBe('BULLISH');
    expect(result.plusDI).toBeGreaterThan(result.minusDI);
  });

  it('should calculate ADX for strong downtrend', () => {
    // Create 50 candles with strong downtrend
    const candles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 150 - i,
      high: 152 - i,
      low: 145 - i,
      close: 148 - i,
      volume: 1000,
    }));

    const result = calculateADX(candles);
    expect(result.adx).toBeGreaterThan(25);
    expect(result.trendStrength).toBe('STRONG');
    expect(result.trendDirection).toBe('BEARISH');
    expect(result.minusDI).toBeGreaterThan(result.plusDI);
  });

  it('should calculate ADX for ranging market', () => {
    // Create 50 candles with sideways movement
    const candles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100 + Math.sin(i * 0.2) * 5,
      volume: 1000,
    }));

    const result = calculateADX(candles);
    expect(result.adx).toBeLessThan(25);
    expect(result.trendStrength).not.toBe('STRONG');
  });
});
