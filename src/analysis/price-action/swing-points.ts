/**
 * Swing Points Detection
 * Finds swing highs and lows using lookback/lookahead method
 */
import type { Candle } from '@/types/market-data';
import type { SwingPoint } from '@/types/price-action';

/**
 * Find swing highs and lows in candle data
 * Uses a lookback/lookahead window to identify local extrema
 */
export function findSwingPoints(
  candles: Candle[],
  lookbackLeft: number = 5,
  lookbackRight: number = 5
): SwingPoint[] {
  if (candles.length < lookbackLeft + lookbackRight + 1) {
    return [];
  }

  const swingPoints: SwingPoint[] = [];

  for (let i = lookbackLeft; i < candles.length - lookbackRight; i++) {
    const current = candles[i]!;
    let isSwingHigh = true;
    let isSwingLow = true;

    // Check left side
    for (let j = i - lookbackLeft; j < i; j++) {
      const leftCandle = candles[j]!;
      if (leftCandle.high > current.high) isSwingHigh = false;
      if (leftCandle.low < current.low) isSwingLow = false;
    }

    // Check right side
    for (let j = i + 1; j <= i + lookbackRight; j++) {
      const rightCandle = candles[j]!;
      if (rightCandle.high > current.high) isSwingHigh = false;
      if (rightCandle.low < current.low) isSwingLow = false;
    }

    if (isSwingHigh) {
      const strength = calculateSwingStrength(candles, i, 'HIGH', lookbackLeft, lookbackRight);
      swingPoints.push({
        index: i,
        price: current.high,
        type: 'HIGH',
        timestamp: current.timestamp,
        strength,
        lookbackLeft,
        lookbackRight,
      });
    }

    if (isSwingLow) {
      const strength = calculateSwingStrength(candles, i, 'LOW', lookbackLeft, lookbackRight);
      swingPoints.push({
        index: i,
        price: current.low,
        type: 'LOW',
        timestamp: current.timestamp,
        strength,
        lookbackLeft,
        lookbackRight,
      });
    }
  }

  // Sort by timestamp
  swingPoints.sort((a, b) => a.timestamp - b.timestamp);
  return swingPoints;
}

/**
 * Calculate swing point strength based on how prominent it is
 */
function calculateSwingStrength(
  candles: Candle[],
  index: number,
  type: 'HIGH' | 'LOW',
  lookbackLeft: number,
  lookbackRight: number
): number {
  const current = candles[index]!;
  let totalDiff = 0;
  let count = 0;

  // Look at surrounding candles to measure prominence
  const start = Math.max(0, index - lookbackLeft);
  const end = Math.min(candles.length - 1, index + lookbackRight);

  for (let i = start; i <= end; i++) {
    if (i === index) continue;
    const candle = candles[i]!;
    if (type === 'HIGH') {
      totalDiff += current.high - candle.high;
    } else {
      totalDiff += candle.low - current.low;
    }
    count++;
  }

  if (count === 0) return 50;

  const avgDiff = totalDiff / count;
  const priceRange = current.high - current.low;
  if (priceRange === 0) return 50;

  // Normalize strength to 0-100
  const strength = Math.min(100, Math.max(0, (avgDiff / priceRange) * 50 + 50));
  return Math.round(strength);
}

/**
 * Get the most recent swing high
 */
export function getLastSwingHigh(swings: SwingPoint[]): SwingPoint | undefined {
  return swings.filter((s) => s.type === 'HIGH').pop();
}

/**
 * Get the most recent swing low
 */
export function getLastSwingLow(swings: SwingPoint[]): SwingPoint | undefined {
  return swings.filter((s) => s.type === 'LOW').pop();
}
