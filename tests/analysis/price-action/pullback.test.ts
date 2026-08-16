/**
 * Pullback Detection Tests
 */
import { describe, it, expect } from 'vitest';
import { detectPullbacks } from '@/analysis/price-action';
import type { PriceZone, MarketStructure } from '@/types/price-action';

describe('detectPullbacks', () => {
  it('should return empty array for empty inputs', () => {
    const result = detectPullbacks([], [], {
      type: 'UNKNOWN',
      swingHighs: [],
      swingLows: [],
      currentTrend: 'NEUTRAL',
      bosDetected: false,
      chochDetected: false,
    });
    expect(result).toEqual([]);
  });

  it('should return empty array when no pullback detected', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i,
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000,
    }));

    const supportZones: PriceZone[] = [];
    const structure: MarketStructure = {
      type: 'HH_HL',
      swingHighs: [],
      swingLows: [],
      currentTrend: 'BULLISH',
      bosDetected: false,
      chochDetected: false,
    };

    const result = detectPullbacks(candles, supportZones, structure);
    expect(result).toEqual([]);
  });
});
