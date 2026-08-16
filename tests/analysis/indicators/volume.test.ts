/**
 * Volume Indicator Tests
 * Real implementation from Sprint 3
 */
import { describe, it, expect } from 'vitest';
import { calculateVolume } from '@/analysis/indicators';

describe('calculateVolume', () => {
  it('should return default values for empty array', () => {
    const result = calculateVolume([]);
    expect(result).toEqual({
      volume: 0,
      volumeSMA20: 0,
      relativeVolume: 1,
      signal: 'NORMAL',
    });
  });

  it('should return default values for insufficient data', () => {
    const candles = [{ timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 }];
    const result = calculateVolume(candles);
    expect(result).toEqual({
      volume: 1000,
      volumeSMA20: 1000,
      relativeVolume: 1,
      signal: 'NORMAL',
    });
  });

  it('should calculate volume with high relative volume', () => {
    // Create 30 candles with one high volume day
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: i === 29 ? 5000 : 1000, // Last day has 5x volume
    }));

    const result = calculateVolume(candles);
    expect(result.volume).toBe(5000);
    expect(result.relativeVolume).toBeGreaterThan(1.5);
    expect(result.signal).toBe('HIGH');
  });

  it('should calculate volume with low relative volume', () => {
    // Create 30 candles with one low volume day
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: i === 29 ? 300 : 1000, // Last day has 0.3x volume
    }));

    const result = calculateVolume(candles);
    expect(result.volume).toBe(300);
    expect(result.relativeVolume).toBeLessThan(0.5);
    expect(result.signal).toBe('LOW');
  });

  it('should calculate normal relative volume for consistent volume', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 100,
      volume: 1000,
    }));

    const result = calculateVolume(candles);
    expect(result.relativeVolume).toBeCloseTo(1, 1);
    expect(result.signal).toBe('NORMAL');
  });
});
