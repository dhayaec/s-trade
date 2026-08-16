/**
 * Breakout Detection
 * Detects price breaking through resistance zones with volume confirmation
 */
import type { Candle } from '@/types/market-data';
import type { PriceZone, Breakout } from '@/types/price-action';

const MIN_VOLUME_MULTIPLIER = 1.2;

/**
 * Detect breakouts through resistance zones
 */
export function detectBreakouts(
  candles: Candle[],
  resistanceZones: PriceZone[],
  volumeSeries?: number[]
): Breakout[] {
  if (candles.length === 0 || resistanceZones.length === 0) {
    return [];
  }

  const breakouts: Breakout[] = [];
  const avgVolume = volumeSeries
    ? volumeSeries.reduce((a, b) => a + b, 0) / volumeSeries.length
    : candles.reduce((a, b) => a + b.volume, 0) / candles.length;

  for (const zone of resistanceZones) {
    if (zone.isBroken) continue; // Already broken

    // Check each candle for breakout
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i]!;
      const vol = volumeSeries?.[i] ?? candle.volume;
      const volumeMultiplier = avgVolume > 0 ? vol / avgVolume : 1;
      const closeAbove = candle.close > zone.upper;

      if (closeAbove && candle.high > zone.upper) {
        // Potential breakout detected
        const breakout = analyzeBreakout(candles, i, zone, vol, avgVolume, volumeMultiplier);
        if (breakout) {
          breakouts.push(breakout);
          zone.isBroken = true;
          zone.brokenAt = candle.timestamp;
          break; // Only first breakout per zone
        }
      }
    }
  }

  return breakouts;
}

/**
 * Analyze a potential breakout for validity and strength
 */
function analyzeBreakout(
  candles: Candle[],
  breakoutIndex: number,
  zone: PriceZone,
  breakoutVolume: number,
  avgVolume: number,
  volumeMultiplier: number
): Breakout | null {
  const breakoutCandle = candles[breakoutIndex]!;

  // Must close above resistance
  if (breakoutCandle.close <= zone.upper) {
    return null;
  }

  // Calculate strength based on multiple factors
  let strength = 50;

  // Volume factor
  if (volumeMultiplier >= 2) strength += 25;
  else if (volumeMultiplier >= 1.5) strength += 15;
  else if (volumeMultiplier >= MIN_VOLUME_MULTIPLIER) strength += 10;

  // Zone strength factor
  strength += zone.strength * 0.2;

  // Distance above resistance
  const distancePct = (breakoutCandle.close - zone.upper) / zone.upper;
  if (distancePct > 0.02)
    strength += 15; // > 2% above
  else if (distancePct > 0.01)
    strength += 10; // > 1% above
  else if (distancePct > 0.005) strength += 5; // > 0.5% above

  // Candle body size (strong close)
  const bodySize = Math.abs(breakoutCandle.close - breakoutCandle.open);
  const candleRange = breakoutCandle.high - breakoutCandle.low;
  if (candleRange > 0 && bodySize / candleRange > 0.6) strength += 10;

  // Determine breakout type
  let type: Breakout['type'] = 'RESISTANCE_BREAK';
  if (zone.sources.includes('CONSOLIDATION_TOP')) type = 'CONSOLIDATION_BREAK';
  else if (zone.sources.includes('SWING_HIGH') && zone.touches >= 3) type = 'RANGE_BREAK';
  else if (zone.sources.includes('PREV_DAY_HIGH') || zone.sources.includes('PREV_WEEK_HIGH'))
    type = 'PREV_HIGH_BREAK';

  // Check for retest
  let retested = false;
  let retestCandleIndex: number | undefined;

  for (let i = breakoutIndex + 1; i < Math.min(breakoutIndex + 10, candles.length); i++) {
    const c = candles[i]!;
    // Retest: price comes back to zone but holds above
    if (c.low <= zone.upper * 1.005 && c.low >= zone.lower * 0.995 && c.close > zone.lower) {
      retested = true;
      retestCandleIndex = i;
      strength += 10; // Retest adds strength
      break;
    }
  }

  return {
    zone,
    breakoutCandleIndex: breakoutIndex,
    breakoutPrice: breakoutCandle.close,
    breakoutVolume,
    avgVolume,
    volumeMultiplier,
    closeAbove: true,
    retested,
    retestCandleIndex,
    strength: Math.min(100, Math.max(0, strength)),
    type,
  };
}

/**
 * Get the most recent active breakout
 */
export function getCurrentBreakout(breakouts: Breakout[]): Breakout | undefined {
  if (breakouts.length === 0) return undefined;
  // Return the most recent one
  return breakouts[breakouts.length - 1];
}

/**
 * Check if a breakout is still valid (not failed)
 */
export function isBreakoutValid(breakout: Breakout, candles: Candle[]): boolean {
  if (breakout.retested) return true; // Retested breakouts are stronger

  // Check if price has fallen back below the breakout level
  const breakoutIdx = breakout.breakoutCandleIndex;
  for (let i = breakoutIdx + 1; i < candles.length; i++) {
    const candle = candles[i]!;
    if (candle.close < breakout.zone.lower) {
      return false; // Breakout failed
    }
  }

  return true;
}
