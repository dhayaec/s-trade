/**
 * CPR (Central Pivot Range) Module
 * Calculate CPR levels: Pivot, BC, TC, width, classification
 */
import type { Candle } from '@/types/market-data';
import type {
  CPRAnalysis,
  CPRLevels,
  CPRClassification,
  CPRBreakoutSignal,
  CPRRejectionSignal,
  CPRTrendAlignment,
  MultiDayCPR,
  CPRData,
} from '@/types/cpr';

/**
 * Calculate CPR for a series of candles
 */
export function calculateCPR(candles: Candle[]): CPRAnalysis | null {
  if (candles.length < 2) return null;

  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  if (!prev || !curr) return null;

  return calculateCPRFromOHLC(prev.high, prev.low, prev.close, curr.open);
}

/**
 * Calculate CPR from OHLC values
 */
export function calculateCPRFromOHLC(
  high: number,
  low: number,
  close: number,
  open: number
): CPRAnalysis {
  const pivot = (high + low + close) / 3;
  const bc = (high + low) / 2;
  const tc = pivot + (pivot - bc);
  const width = Math.abs(tc - bc);
  const widthPercent = (width / pivot) * 100;

  let classification: CPRClassification = 'NORMAL';
  if (widthPercent < 0.5) classification = 'NARROW';
  else if (widthPercent > 1.5) classification = 'WIDE';

  const levels: CPRLevels = {
    tc,
    pivot,
    bc,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  };

  const currentPrice = close;
  const position = calculateCPRPosition(currentPrice, tc, bc, pivot);
  const distanceToBC = ((currentPrice - bc) / bc) * 100;
  const distanceToTC = ((currentPrice - tc) / tc) * 100;
  const distanceToPivot = ((currentPrice - pivot) / pivot) * 100;

  return {
    cpr: {
      pivot,
      bc,
      tc,
      width,
      widthPercent,
      classification,
      previousDay: { open, high, low, close },
    },
    levels,
    currentPrice,
    position,
    distanceToBC,
    distanceToTC,
    distanceToPivot,
    breakout: null,
    rejection: null,
    alignment: 'NEUTRAL',
    multiDay: null,
  };
}

/**
 * Calculate CPR position relative to current price
 */
function calculateCPRPosition(
  price: number,
  tc: number,
  bc: number,
  pivot: number
): CPRAnalysis['position'] {
  const epsilon = pivot * 0.001; // 0.1% tolerance

  if (Math.abs(price - bc) <= epsilon) return 'AT_BC';
  if (Math.abs(price - tc) <= epsilon) return 'AT_TC';
  if (price > tc) return 'ABOVE';
  if (price < bc) return 'BELOW';
  return 'INSIDE';
}

/**
 * Check CPR breakout signal
 */
export function checkCPRBreakout(
  cpr: CPRAnalysis,
  price: number,
  volume: number,
  avgVolume: number
): CPRBreakoutSignal | null {
  const { tc, bc } = cpr.cpr;
  const volumeConfirmed = volume >= avgVolume * 1.2; // 20% above average
  const volumeRatio = volume / avgVolume;

  // Upward breakout: price closes above TC
  if (price > tc) {
    const breakoutStrength = Math.min(100, 50 + (volumeRatio - 1) * 25);
    return {
      direction: 'UP',
      breakoutCandleIndex: -1, // current candle
      breakoutPrice: price,
      volumeConfirmed,
      strength: Math.round(breakoutStrength),
    };
  }

  // Downward breakout: price closes below BC
  if (price < bc) {
    const breakoutStrength = Math.min(100, 50 + (volumeRatio - 1) * 25);
    return {
      direction: 'DOWN',
      breakoutCandleIndex: -1,
      breakoutPrice: price,
      volumeConfirmed,
      strength: Math.round(breakoutStrength),
    };
  }

  return null;
}

/**
 * Check CPR rejection signal
 */
export function checkCPRRejection(
  cpr: CPRAnalysis,
  price: number,
  candle: Candle
): CPRRejectionSignal | null {
  const { tc, bc, pivot } = cpr.cpr;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const bodySize = Math.abs(candle.open - candle.close);
  const totalRange = candle.high - candle.low;

  // Rejection from TC (bearish rejection - price hit TC and reversed down)
  if (candle.high >= tc && price < tc) {
    // Strong rejection: upper wick > body and price closed below TC
    if (upperWick > bodySize * 1.5 && upperWick > totalRange * 0.3) {
      const strength = Math.min(100, 60 + (upperWick / bodySize) * 10);
      return {
        direction: 'DOWN',
        rejectionCandleIndex: -1,
        rejectionPrice: candle.high,
        candleType: upperWick > bodySize * 3 ? 'SHOOTING_STAR' : 'BEARISH_REJECTION',
        strength: Math.round(strength),
      };
    }
  }

  // Rejection from BC (bullish rejection - price hit BC and reversed up)
  if (candle.low <= bc && price > bc) {
    // Strong rejection: lower wick > body and price closed above BC
    if (lowerWick > bodySize * 1.5 && lowerWick > totalRange * 0.3) {
      const strength = Math.min(100, 60 + (lowerWick / bodySize) * 10);
      return {
        direction: 'UP',
        rejectionCandleIndex: -1,
        rejectionPrice: candle.low,
        candleType: lowerWick > bodySize * 3 ? 'HAMMER' : 'BULLISH_REJECTION',
        strength: Math.round(strength),
      };
    }
  }

  // Rejection from Pivot (can be either direction)
  if (candle.high >= pivot && price < pivot && price > bc) {
    if (upperWick > bodySize * 1.5) {
      return {
        direction: 'DOWN',
        rejectionCandleIndex: -1,
        rejectionPrice: candle.high,
        candleType: 'PIVOT_REJECTION_BEARISH',
        strength: 50,
      };
    }
  }

  if (candle.low <= pivot && price > pivot && price < tc) {
    if (lowerWick > bodySize * 1.5) {
      return {
        direction: 'UP',
        rejectionCandleIndex: -1,
        rejectionPrice: candle.low,
        candleType: 'PIVOT_REJECTION_BULLISH',
        strength: 50,
      };
    }
  }

  return null;
}

/**
 * Check CPR trend alignment
 */
export function checkCPRTrendAlignment(
  cpr: CPRAnalysis,
  ema20: number,
  ema50: number,
  ema200: number
): CPRTrendAlignment {
  const { pivot } = cpr.cpr;
  const currentPrice = cpr.currentPrice;

  // Check EMA alignment
  const emaBullish = ema20 > ema50 && ema50 > ema200;
  const emaBearish = ema20 < ema50 && ema50 < ema200;

  // Check price position relative to EMAs
  const priceAboveEMA20 = currentPrice > ema20;
  const priceAboveEMA50 = currentPrice > ema50;
  const priceAboveEMA200 = currentPrice > ema200;

  // Check CPR position relative to EMAs
  const cprAboveEMA20 = pivot > ema20;
  const cprAboveEMA50 = pivot > ema50;
  const cprAboveEMA200 = pivot > ema200;

  // Bullish alignment: Price above CPR, CPR above EMAs, EMAs aligned bullish
  const bullishSignals = [
    priceAboveEMA20,
    priceAboveEMA50,
    priceAboveEMA200,
    cprAboveEMA20,
    cprAboveEMA50,
    cprAboveEMA200,
    emaBullish,
  ].filter(Boolean).length;

  // Bearish alignment: Price below CPR, CPR below EMAs, EMAs aligned bearish
  const bearishSignals = [
    !priceAboveEMA20,
    !priceAboveEMA50,
    !priceAboveEMA200,
    !cprAboveEMA20,
    !cprAboveEMA50,
    !cprAboveEMA200,
    emaBearish,
  ].filter(Boolean).length;

  if (bullishSignals >= 5) return 'BULLISH';
  if (bearishSignals >= 5) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Calculate multi-day CPR
 */
export function calculateMultiDayCPR(candles: Candle[], days: number = 5): MultiDayCPR[] {
  if (candles.length < days + 1) return [];

  const cprDays: CPRData[] = [];

  // Need at least 2 candles per day (prev + current)
  // For multi-day, we'll calculate CPR for each day using the day's OHLC
  for (let i = candles.length - days; i < candles.length - 1; i++) {
    const prev = candles[i];
    const curr = candles[i + 1];
    if (!prev || !curr) continue;

    const cpr = calculateCPRFromOHLC(prev.high, prev.low, prev.close, curr.open);
    cprDays.push(cpr.cpr);
  }

  // Need at least 3 days for meaningful analysis
  if (cprDays.length < 3) return [];

  // Analyze multi-day characteristics using array indexing with known bounds
  const len = cprDays.length;
  const last = cprDays[len - 1];
  const prev = cprDays[len - 2];
  const prevPrev = cprDays[len - 3];

  // Check for narrowing (width decreasing)
  const narrowing = last.width < prev.width && prev.width < prevPrev.width;

  // Check for widening (width increasing)
  const widening = last.width > prev.width && prev.width > prevPrev.width;

  // Check convergence (price approaching CPR)
  // Note: CPRData doesn't have currentPrice, we'll use the close from previousDay as approximation
  const convergence =
    Math.abs(last.pivot - last.previousDay.close) < Math.abs(prev.pivot - prev.previousDay.close) &&
    Math.abs(prev.pivot - prev.previousDay.close) <
      Math.abs(prevPrev.pivot - prevPrev.previousDay.close);

  // Check breakout streak
  let breakoutStreak = 0;
  let currentDirection: 'UP' | 'DOWN' | null = null;

  for (let i = len - 1; i >= 0; i--) {
    const r = cprDays[i];
    // Use previousDay.close as the "current price" for that day
    const dayClose = r.previousDay.close;
    const dayDirection = dayClose > r.tc ? 'UP' : dayClose < r.bc ? 'DOWN' : null;

    if (dayDirection === currentDirection && dayDirection !== null) {
      breakoutStreak++;
    } else if (dayDirection !== null) {
      currentDirection = dayDirection;
      breakoutStreak = 1;
    } else {
      break;
    }
  }

  return [
    {
      days: cprDays,
      narrowing,
      widening,
      convergence,
      breakoutStreak,
    },
  ];
}
