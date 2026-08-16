/**
 * Breakout Detection Tests
 */
import { describe, it, expect } from 'vitest';
import { detectBreakouts } from '@/analysis/price-action';
import type { PriceZone } from '@/types/price-action';

describe('detectBreakouts', () => {
  it('should return empty array for empty inputs', () => {
    const result = detectBreakouts([], []);
    expect(result).toEqual([]);
  });

  it('should return empty array when no breakout occurs', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      timestamp: i,
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
    }));

    const resistanceZones: PriceZone[] = [
      {
        lower: 110,
        upper: 112,
        center: 111,
        type: 'RESISTANCE',
        strength: 80,
        touches: 3,
        timeframe: '1d',
        sources: ['SWING_HIGH'],
        firstTouch: 1,
        lastTouch: 10,
        volumeAtTouches: [1000, 1000, 1000],
        isBroken: false,
      },
    ];

    const result = detectBreakouts(candles, resistanceZones);
    expect(result).toEqual([]);
  });
});
