/**
 * Engulfing Pattern Tests
 */
import { describe, it, expect } from 'vitest';
import { detectEngulfing, detectCandlestickPatterns } from '@/analysis/candlesticks';

describe('detectEngulfing', () => {
  it('should return null for empty candles', () => {
    const result = detectEngulfing([], 0);
    expect(result).toBeNull();
  });

  it('should return null for invalid index', () => {
    const candles = [{ timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 }];
    const result = detectEngulfing(candles, 5);
    expect(result).toBeNull();
  });
});

describe('detectCandlestickPatterns', () => {
  it('should return empty array for empty candles', () => {
    const result = detectCandlestickPatterns([]);
    expect(result).toEqual([]);
  });
});
