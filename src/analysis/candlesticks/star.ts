/**
 * Morning Star / Evening Star Pattern Detection
 * 3-candle reversal patterns
 */
import type { Candle } from '@/types/market-data';
import type { CandlestickPattern, ContextFactor } from '@/types/candlesticks';
import { analyzeCandleShape } from './hammer';

const STAR_MIDDLE_BODY_RATIO_MAX = 0.3;

/**
 * Detect Morning Star pattern (bullish reversal)
 * Candle 1: Large bearish
 * Candle 2: Small body (doji/spinning top) - gaps down
 * Candle 3: Large bullish, closes above midpoint of candle 1
 */
export function detectMorningStar(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 2 || index >= candles.length) return null;

  const c1 = candles[index - 2]!;
  const c2 = candles[index - 1]!;
  const c3 = candles[index]!;

  const s1 = analyzeCandleShape(c1, undefined);
  const s2 = analyzeCandleShape(c2, c1);
  const s3 = analyzeCandleShape(c3, c2);

  // Morning Star conditions
  const c1Bearish = s1.isBearish && s1.bodyRatio > 0.5; // Large bearish
  const c2Small = s2.bodyRatio < STAR_MIDDLE_BODY_RATIO_MAX; // Small body (doji/star)
  const c3Bullish = s3.isBullish && s3.bodyRatio > 0.5; // Large bullish

  // Candle 3 closes above midpoint of candle 1
  const c1Midpoint = (c1.open + c1.close) / 2;
  const c3ClosesAboveMid = c3.close > c1Midpoint;

  // Gap down from c1 to c2 (optional but strengthens)
  const gapDown = c2.high < c1.low;

  if (!(c1Bearish && c2Small && c3Bullish && c3ClosesAboveMid)) return null;

  // Calculate base confidence
  const c1Quality = Math.min(1, s1.bodyRatio); // Larger bearish = better
  const c2Quality = s2.isDoji ? 1 : 1 - s2.bodyRatio / STAR_MIDDLE_BODY_RATIO_MAX; // Doji = best
  const c3Quality = Math.min(1, s3.bodyRatio); // Larger bullish = better
  const gapQuality = gapDown ? 1 : 0.7;

  const confidence = Math.round(
    (c1Quality * 0.25 + c2Quality * 0.25 + c3Quality * 0.3 + gapQuality * 0.2) * 100
  );

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Morning Star Structure',
      description: 'Large bearish, small middle candle, large bullish closing above midpoint',
      bonus: 0,
      met: true,
    },
    {
      factor: gapDown ? 'Gap Down' : 'No Gap Down',
      description: gapDown
        ? 'Gap down between first and middle candle'
        : 'No gap down between candles',
      bonus: gapDown ? 5 : -10,
      met: gapDown,
    },
  ];

  return {
    name: 'Morning Star',
    type: 'MORNING_STAR',
    direction: 'BULLISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index - 2, index - 1, index],
    timestamp: c3.timestamp,
    explanation: 'Morning Star pattern - bullish 3-candle reversal with strong confirmation',
    contextFactors,
  };
}

/**
 * Detect Evening Star pattern (bearish reversal)
 * Candle 1: Large bullish
 * Candle 2: Small body (doji/spinning top) - gaps up
 * Candle 3: Large bearish, closes below midpoint of candle 1
 */
export function detectEveningStar(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 2 || index >= candles.length) return null;

  const c1 = candles[index - 2]!;
  const c2 = candles[index - 1]!;
  const c3 = candles[index]!;

  const s1 = analyzeCandleShape(c1, undefined);
  const s2 = analyzeCandleShape(c2, c1);
  const s3 = analyzeCandleShape(c3, c2);

  // Evening Star conditions
  const c1Bullish = s1.isBullish && s1.bodyRatio > 0.5;
  const c2Small = s2.bodyRatio < STAR_MIDDLE_BODY_RATIO_MAX;
  const c3Bearish = s3.isBearish && s3.bodyRatio > 0.5;

  // Candle 3 closes below midpoint of candle 1
  const c1Midpoint = (c1.open + c1.close) / 2;
  const c3ClosesBelowMid = c3.close < c1Midpoint;

  // Gap up from c1 to c2
  const gapUp = c2.low > c1.high;

  if (!(c1Bullish && c2Small && c3Bearish && c3ClosesBelowMid)) return null;

  // Calculate base confidence
  const c1Quality = Math.min(1, s1.bodyRatio);
  const c2Quality = s2.isDoji ? 1 : 1 - s2.bodyRatio / STAR_MIDDLE_BODY_RATIO_MAX;
  const c3Quality = Math.min(1, s3.bodyRatio);
  const gapQuality = gapUp ? 1 : 0.7;

  const confidence = Math.round(
    (c1Quality * 0.25 + c2Quality * 0.25 + c3Quality * 0.3 + gapQuality * 0.2) * 100
  );

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Evening Star Structure',
      description: 'Large bullish, small middle candle, large bearish closing below midpoint',
      bonus: 0,
      met: true,
    },
    {
      factor: gapUp ? 'Gap Up' : 'No Gap Up',
      description: gapUp ? 'Gap up between first and middle candle' : 'No gap up between candles',
      bonus: gapUp ? 5 : -10,
      met: gapUp,
    },
  ];

  return {
    name: 'Evening Star',
    type: 'EVENING_STAR',
    direction: 'BEARISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index - 2, index - 1, index],
    timestamp: c3.timestamp,
    explanation: 'Evening Star pattern - bearish 3-candle reversal with strong confirmation',
    contextFactors,
  };
}
