/**
 * Support/Resistance Zones Tests
 */
import { describe, it, expect } from 'vitest';
import { findSwingPoints, findSupportResistanceZones } from '@/analysis/price-action';

describe('findSupportResistanceZones', () => {
  it('should return empty zones for empty arrays', () => {
    const result = findSupportResistanceZones([], []);
    expect(result.supportZones).toEqual([]);
    expect(result.resistanceZones).toEqual([]);
  });

  it('should identify support and resistance zones', () => {
    // Create price action with clear support and resistance levels
    const candles = Array.from({ length: 30 }, (_, i) => {
      let price = 100;
      if (i < 10) price = 100 + Math.sin(i) * 5;
      else if (i < 20) price = 110 + Math.sin(i * 0.5) * 3;
      else price = 115 + Math.sin(i * 0.3) * 4;

      return {
        timestamp: i,
        open: price,
        high: price + 2,
        low: price - 2,
        close: price + (Math.random() - 0.5) * 1,
        volume: 1000,
      };
    });

    const swings = findSwingPoints(candles, 3, 3);
    const result = findSupportResistanceZones(candles, swings);

    expect(result.supportZones).toBeDefined();
    expect(result.resistanceZones).toBeDefined();

    // Check zone structure
    for (const zone of [...result.supportZones, ...result.resistanceZones]) {
      expect(zone).toHaveProperty('lower');
      expect(zone).toHaveProperty('upper');
      expect(zone).toHaveProperty('center');
      expect(zone).toHaveProperty('type');
      expect(zone).toHaveProperty('strength');
      expect(zone).toHaveProperty('touches');
      expect(zone).toHaveProperty('timeframe');
      expect(zone).toHaveProperty('sources');
      expect(['SUPPORT', 'RESISTANCE']).toContain(zone.type);
    }
  });
});
