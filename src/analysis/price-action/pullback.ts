/**
 * Pullback Detection
 * Detects pullbacks in trending markets with support zone and candlestick confirmation
 */
import type { Candle } from '@/types/market-data';
import type { PriceZone, MarketStructure, Pullback } from '@/types/price-action';
import type { EMAValue } from '@/types/indicators';

const PULLBACK_DEPTH_THRESHOLDS = {
  SHALLOW: 0.25, // < 25% retracement
  NORMAL: 0.5, // 25-50% retracement
  DEEP: 0.618, // 50-61.8% retracement
  EXCESSIVE: 0.786, // > 61.8% retracement
};

/**
 * Detect pullbacks in uptrend/downtrend
 */
export function detectPullbacks(
  candles: Candle[],
  supportZones: PriceZone[],
  structure: MarketStructure,
  emaValues?: EMAValue
): Pullback[] {
  if (candles.length < 20 || supportZones.length === 0) {
    return [];
  }

  // Only detect pullbacks in trending markets
  if (structure.currentTrend === 'NEUTRAL') {
    return [];
  }

  const pullbacks: Pullback[] = [];
  const isUptrend = structure.currentTrend === 'BULLISH';

  // Find impulses and pullbacks
  const swings = isUptrend ? structure.swingLows : structure.swingHighs;
  if (swings.length < 2) return [];

  // Analyze each swing as potential impulse end
  for (let i = 1; i < swings.length; i++) {
    const prevSwing = swings[i - 1];
    const currSwing = swings[i];
    if (!prevSwing || !currSwing) continue;

    // Impulse: from previous swing to current swing
    // Pullback: from current swing back towards previous swing
    const pullback = analyzePullback(
      candles,
      prevSwing,
      currSwing,
      supportZones,
      isUptrend,
      emaValues
    );

    if (pullback) {
      pullbacks.push(pullback);
    }
  }

  return pullbacks;
}

/**
 * Analyze a specific pullback from swing high/low
 */
function analyzePullback(
  candles: Candle[],
  impulseStartSwing: { index: number; price: number; timestamp: number },
  impulseEndSwing: { index: number; price: number; timestamp: number },
  supportZones: PriceZone[],
  isUptrend: boolean,
  emaValues?: EMAValue
): Pullback | null {
  const impulseStartIdx = impulseStartSwing.index;
  const impulseEndIdx = impulseEndSwing.index;

  // Must have enough candles between swings
  if (impulseEndIdx - impulseStartIdx < 3) return null;

  // Impulse price range
  const impulseStartPrice = isUptrend ? impulseStartSwing.price : impulseStartSwing.price;
  const impulseEndPrice = isUptrend ? impulseEndSwing.price : impulseEndSwing.price;

  const impulseSize = isUptrend
    ? impulseEndPrice - impulseStartPrice
    : impulseStartPrice - impulseEndPrice;

  if (impulseSize <= 0) return null;

  // Look for pullback after impulse end
  const searchStart = impulseEndIdx;
  const searchEnd = Math.min(impulseEndIdx + 20, candles.length - 1);

  let pullbackLowIdx = impulseEndIdx;
  let pullbackLowPrice = candles[impulseEndIdx]!.close;

  // Find the lowest point in pullback (for uptrend)
  for (let i = searchStart; i <= searchEnd; i++) {
    const candle = candles[i]!;
    if (isUptrend) {
      if (candle.low < pullbackLowPrice) {
        pullbackLowPrice = candle.low;
        pullbackLowIdx = i;
      }
    } else {
      if (candle.high > pullbackLowPrice) {
        pullbackLowPrice = candle.high;
        pullbackLowIdx = i;
      }
    }
  }

  // Must have some pullback
  const pullbackSize = isUptrend
    ? impulseEndPrice - pullbackLowPrice
    : pullbackLowPrice - impulseEndPrice;

  if (pullbackSize <= 0) return null;

  // Calculate depth as percentage of impulse
  const depth = pullbackSize / impulseSize;

  // Determine depth category
  let depthCategory: Pullback['depthCategory'] = 'SHALLOW';
  if (depth > PULLBACK_DEPTH_THRESHOLDS.EXCESSIVE) depthCategory = 'EXCESSIVE';
  else if (depth > PULLBACK_DEPTH_THRESHOLDS.DEEP) depthCategory = 'DEEP';
  else if (depth > PULLBACK_DEPTH_THRESHOLDS.NORMAL) depthCategory = 'NORMAL';

  // Reject excessive pullbacks
  if (depthCategory === 'EXCESSIVE') return null;

  // Find support zone near pullback low
  const supportZone = findNearestSupportZone(supportZones, pullbackLowPrice, isUptrend);

  // Check EMA touch
  let emaTouched: Pullback['emaTouched'] = undefined;
  if (emaValues && supportZone) {
    emaTouched = checkEMATouch(candles, pullbackLowIdx, emaValues, isUptrend);
  }

  // Look for bullish confirmation candle after pullback low
  const confirmation = findConfirmationCandle(candles, pullbackLowIdx, isUptrend);

  // Calculate strength
  const strength = calculatePullbackStrength(
    depth,
    depthCategory,
    supportZone,
    emaTouched,
    confirmation
  );

  return {
    impulseStartIndex: impulseStartIdx,
    impulseEndIndex: impulseEndIdx,
    pullbackStartIndex: impulseEndIdx,
    pullbackEndIndex: pullbackLowIdx,
    pullbackLowIndex: pullbackLowIdx,
    supportZone,
    emaTouched,
    confirmationCandleIndex: confirmation?.index,
    confirmationType: confirmation?.type,
    depth,
    depthCategory,
    strength,
  };
}

/**
 * Find nearest support zone to pullback price
 */
function findNearestSupportZone(
  zones: PriceZone[],
  price: number,
  isUptrend: boolean
): PriceZone | undefined {
  const relevantZones = zones.filter((z) => z.type === (isUptrend ? 'SUPPORT' : 'RESISTANCE'));
  if (relevantZones.length === 0) return undefined;

  // Find zone with center closest to price
  return relevantZones.reduce((closest, zone) => {
    const currDist = Math.abs(closest.center - price);
    const newDist = Math.abs(zone.center - price);
    return newDist < currDist ? zone : closest;
  });
}

/**
 * Check if pullback touched an EMA
 */
function checkEMATouch(
  candles: Candle[],
  pullbackLowIdx: number,
  emaValues: EMAValue,
  isUptrend: boolean
): Pullback['emaTouched'] {
  const candle = candles[pullbackLowIdx]!;
  const tolerance = (candle.high - candle.low) * 0.2; // 20% of candle range

  if (isUptrend) {
    // Check if low touched EMA
    if (candle.low <= emaValues.ema20 + tolerance && candle.low >= emaValues.ema20 - tolerance)
      return 'EMA20';
    if (candle.low <= emaValues.ema50 + tolerance && candle.low >= emaValues.ema50 - tolerance)
      return 'EMA50';
    if (candle.low <= emaValues.ema200 + tolerance && candle.low >= emaValues.ema200 - tolerance)
      return 'EMA200';
  } else {
    // Check if high touched EMA
    if (candle.high >= emaValues.ema20 - tolerance && candle.high <= emaValues.ema20 + tolerance)
      return 'EMA20';
    if (candle.high >= emaValues.ema50 - tolerance && candle.high <= emaValues.ema50 + tolerance)
      return 'EMA50';
    if (candle.high >= emaValues.ema200 - tolerance && candle.high <= emaValues.ema200 + tolerance)
      return 'EMA200';
  }

  return undefined;
}

/**
 * Find bullish/bearish confirmation candle after pullback
 */
function findConfirmationCandle(
  candles: Candle[],
  pullbackLowIdx: number,
  isUptrend: boolean
): { index: number; type: Pullback['confirmationType'] } | null {
  // Look at next few candles after pullback low
  for (let i = pullbackLowIdx + 1; i < Math.min(pullbackLowIdx + 5, candles.length); i++) {
    const candle = candles[i]!;
    const prevCandle = candles[i - 1]!;

    if (isUptrend) {
      // Bullish patterns
      const isBullish = candle.close > candle.open;
      const bodySize = candle.close - candle.open;
      const candleRange = candle.high - candle.low;

      // Bullish engulfing
      if (i > 0 && candle.close > prevCandle.open && candle.open < prevCandle.close && isBullish) {
        return { index: i, type: 'BULLISH_ENGULFING' };
      }

      // Hammer
      if (
        candleRange > 0 &&
        bodySize / candleRange < 0.3 &&
        (candle.open - candle.low) / candleRange > 0.6
      ) {
        return { index: i, type: 'HAMMER' };
      }

      // Piercing pattern
      if (
        i > 0 &&
        candle.close > (prevCandle.open + prevCandle.close) / 2 &&
        candle.open < prevCandle.close &&
        isBullish
      ) {
        return { index: i, type: 'PIERCING' };
      }

      // Morning star (3 candles)
      if (i > 1 && isMorningStar(candles[i - 2]!, candles[i - 1]!, candle)) {
        return { index: i, type: 'MORNING_STAR' };
      }

      // Simple bullish candle
      if (isBullish && bodySize / candleRange > 0.5) {
        return { index: i, type: 'BULLISH_CANDLE' };
      }
    } else {
      // Bearish patterns for downtrend pullbacks (reversed logic)
      const isBearish = candle.close < candle.open;
      const bodySize = candle.open - candle.close;
      const candleRange = candle.high - candle.low;

      if (i > 0 && candle.open > prevCandle.close && candle.close < prevCandle.open && isBearish) {
        return { index: i, type: 'BEARISH_ENGULFING' };
      }

      if (
        candleRange > 0 &&
        bodySize / candleRange < 0.3 &&
        (candle.high - candle.open) / candleRange > 0.6
      ) {
        return { index: i, type: 'SHOOTING_STAR' };
      }

      if (
        i > 0 &&
        candle.close < (prevCandle.open + prevCandle.close) / 2 &&
        candle.open > prevCandle.close &&
        isBearish
      ) {
        return { index: i, type: 'DARK_CLOUD_COVER' };
      }

      if (i > 1 && isEveningStar(candles[i - 2]!, candles[i - 1]!, candle)) {
        return { index: i, type: 'EVENING_STAR' };
      }

      if (isBearish && bodySize / candleRange > 0.5) {
        return { index: i, type: 'BEARISH_CANDLE' };
      }
    }
  }

  return null;
}

function isMorningStar(c1: Candle, c2: Candle, c3: Candle): boolean {
  const c1Bearish = c1.close < c1.open;
  const c2Small = Math.abs(c2.close - c2.open) / (c2.high - c2.low) < 0.3;
  const c3Bullish = c3.close > c3.open;
  const c3ClosesAboveMid = c3.close > (c1.open + c1.close) / 2;
  return c1Bearish && c2Small && c3Bullish && c3ClosesAboveMid;
}

function isEveningStar(c1: Candle, c2: Candle, c3: Candle): boolean {
  const c1Bullish = c1.close > c1.open;
  const c2Small = Math.abs(c2.close - c2.open) / (c2.high - c2.low) < 0.3;
  const c3Bearish = c3.close < c3.open;
  const c3ClosesBelowMid = c3.close < (c1.open + c1.close) / 2;
  return c1Bullish && c2Small && c3Bearish && c3ClosesBelowMid;
}

/**
 * Calculate pullback strength score
 */
function calculatePullbackStrength(
  _depth: number,
  depthCategory: Pullback['depthCategory'],
  supportZone: PriceZone | undefined,
  emaTouched: Pullback['emaTouched'],
  confirmation: { index: number; type: Pullback['confirmationType'] } | null
): number {
  let strength = 50;

  // Depth factor - shallower is better for trend continuation
  if (depthCategory === 'SHALLOW') strength += 20;
  else if (depthCategory === 'NORMAL') strength += 10;
  else if (depthCategory === 'DEEP') strength -= 10;

  // Support zone factor
  if (supportZone) {
    strength += Math.min(20, supportZone.strength * 0.2);
  }

  // EMA touch factor
  if (emaTouched) {
    if (emaTouched === 'EMA20') strength += 15;
    else if (emaTouched === 'EMA50') strength += 10;
    else if (emaTouched === 'EMA200') strength += 20;
  }

  // Confirmation factor
  if (confirmation) {
    switch (confirmation.type) {
      case 'BULLISH_ENGULFING':
      case 'BEARISH_ENGULFING':
        strength += 15;
        break;
      case 'MORNING_STAR':
      case 'EVENING_STAR':
        strength += 20;
        break;
      case 'HAMMER':
      case 'SHOOTING_STAR':
        strength += 10;
        break;
      case 'PIERCING':
      case 'DARK_CLOUD_COVER':
        strength += 10;
        break;
      case 'BULLISH_CANDLE':
      case 'BEARISH_CANDLE':
        strength += 5;
        break;
    }
  }

  return Math.min(100, Math.max(0, strength));
}

/**
 * Get the current active pullback
 */
export function getCurrentPullback(pullbacks: Pullback[]): Pullback | undefined {
  if (pullbacks.length === 0) return undefined;
  return pullbacks[pullbacks.length - 1];
}
