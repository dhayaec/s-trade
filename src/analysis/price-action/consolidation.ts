/**
 * Consolidation / Range Detection
 * Detects trading ranges and consolidation patterns
 */
import type { Candle } from '@/types/market-data';
import type { ConsolidationRange } from '@/types/price-action';

const MIN_CONSOLIDATION_CANDLES = 10;
const MAX_RANGE_PCT = 0.08; // Max 8% range for consolidation

/**
 * Detect consolidation ranges in price action
 */
export function detectConsolidation(candles: Candle[]): ConsolidationRange | null {
  if (candles.length < MIN_CONSOLIDATION_CANDLES) {
    return null;
  }

  // Look for consolidation in the most recent candles
  // Use a sliding window approach
  for (
    let windowSize = MIN_CONSOLIDATION_CANDLES;
    windowSize <= 50 && windowSize < candles.length;
    windowSize++
  ) {
    const startIdx = candles.length - windowSize;
    const window = candles.slice(startIdx);

    const range = analyzeRange(window, startIdx);
    if (range) {
      return range;
    }
  }

  return null;
}

/**
 * Analyze a window of candles for consolidation
 */
function analyzeRange(window: Candle[], startIdx: number): ConsolidationRange | null {
  if (window.length < MIN_CONSOLIDATION_CANDLES) return null;

  const highs = window.map((c) => c.high);
  const lows = window.map((c) => c.low);
  const volumes = window.map((c) => c.volume);

  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);
  const rangeCenter = (rangeHigh + rangeLow) / 2;
  const rangeSize = (rangeHigh - rangeLow) / rangeCenter;

  // Range must be tight enough
  if (rangeSize > MAX_RANGE_PCT) return null;

  // Count touches of high and low
  let topTouches = 0;
  let bottomTouches = 0;
  const tolerance = (rangeHigh - rangeLow) * 0.1; // 10% of range

  for (const candle of window) {
    if (candle.high >= rangeHigh - tolerance) topTouches++;
    if (candle.low <= rangeLow + tolerance) bottomTouches++;
  }

  // Need at least 2 touches on each side
  if (topTouches < 2 || bottomTouches < 2) return null;

  // Analyze volume profile
  const volumeProfile = analyzeVolumeProfile(volumes);

  // Check for breakout
  const lastCandle = window[window.length - 1]!;
  let breakoutDirection: 'UP' | 'DOWN' | undefined;
  let breakoutIndex: number | undefined;

  if (lastCandle.close > rangeHigh) {
    breakoutDirection = 'UP';
    breakoutIndex = startIdx + window.length - 1;
  } else if (lastCandle.close < rangeLow) {
    breakoutDirection = 'DOWN';
    breakoutIndex = startIdx + window.length - 1;
  }

  return {
    high: rangeHigh,
    low: rangeLow,
    startIndex: startIdx,
    endIndex: startIdx + window.length - 1,
    duration: window.length,
    touches: topTouches + bottomTouches,
    volumeProfile,
    breakoutDirection,
    breakoutIndex,
  };
}

/**
 * Analyze volume profile within consolidation
 */
function analyzeVolumeProfile(volumes: number[]): ConsolidationRange['volumeProfile'] {
  if (volumes.length < 3) return 'FLAT';

  const firstThird = volumes.slice(0, Math.floor(volumes.length / 3));
  const lastThird = volumes.slice(-Math.floor(volumes.length / 3));

  const firstAvg = firstThird.reduce((a, b) => a + b, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((a, b) => a + b, 0) / lastThird.length;

  if (lastAvg < firstAvg * 0.7) return 'DECREASING';
  if (lastAvg > firstAvg * 1.3) return 'INCREASING';
  return 'FLAT';
}

/**
 * Check if price is currently in consolidation
 */
export function isInConsolidation(candles: Candle[]): boolean {
  return detectConsolidation(candles) !== null;
}

/**
 * Get consolidation breakout level
 */
export function getConsolidationBreakoutLevel(
  candles: Candle[]
): { upper: number; lower: number } | null {
  const consolidation = detectConsolidation(candles);
  if (!consolidation) return null;
  return { upper: consolidation.high, lower: consolidation.low };
}
