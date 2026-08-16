/**
 * Hammer Pattern Detection
 * Bullish reversal pattern with long lower wick, small body at top
 */
import type { Candle } from '@/types/market-data';
import type { CandlestickPattern, ContextFactor, CandleShape } from '@/types/candlesticks';

const HAMMER_LOWER_WICK_RATIO = 0.6;
const HAMMER_UPPER_WICK_RATIO = 0.1;
const HAMMER_BODY_RATIO_MAX = 0.3;

/**
 * Analyze a single candle's shape
 */
export function analyzeCandleShape(candle: Candle, prevCandle: Candle | undefined): CandleShape {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;
  const upperWickRatio = totalRange > 0 ? upperWick / totalRange : 0;
  const lowerWickRatio = totalRange > 0 ? lowerWick / totalRange : 0;

  const isBullish = candle.close > candle.open;
  const isBearish = candle.close < candle.open;
  const isDoji = bodyRatio < 0.1;

  // Hammer: lower wick > 60% of range, upper wick < 10%, body at top
  const isHammer =
    lowerWickRatio > HAMMER_LOWER_WICK_RATIO &&
    upperWickRatio < HAMMER_UPPER_WICK_RATIO &&
    bodyRatio < HAMMER_BODY_RATIO_MAX;

  // Shooting Star: upper wick > 60%, lower wick < 10%, body at bottom
  const isShootingStar =
    upperWickRatio > HAMMER_LOWER_WICK_RATIO &&
    lowerWickRatio < HAMMER_UPPER_WICK_RATIO &&
    bodyRatio < HAMMER_BODY_RATIO_MAX;

  // Engulfing: body engulfs previous candle's body
  let isEngulfing = false;
  if (prevCandle) {
    const prevBodySize = Math.abs(prevCandle.close - prevCandle.open);
    isEngulfing =
      bodySize > prevBodySize &&
      ((isBullish && candle.open < prevCandle.close && candle.close > prevCandle.open) ||
        (isBearish && candle.open > prevCandle.close && candle.close < prevCandle.open));
  }

  // Inside Bar: high <= prevHigh && low >= prevLow
  const isInsideBar = prevCandle
    ? candle.high <= prevCandle.high && candle.low >= prevCandle.low
    : false;

  return {
    bodySize,
    upperWick,
    lowerWick,
    totalRange,
    bodyRatio,
    upperWickRatio,
    lowerWickRatio,
    isBullish,
    isBearish,
    isDoji,
    isHammer,
    isShootingStar,
    isEngulfing,
    isInsideBar,
  };
}

/**
 * Detect hammer pattern at specific index
 * Hammer is a bullish reversal pattern
 */
export function detectHammer(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= candles.length) return null;

  const candle = candles[index]!;
  const prevCandle = index > 0 ? candles[index - 1] : undefined;
  const shape = analyzeCandleShape(candle, prevCandle);

  // Hammer: small body at top, long lower wick, little/no upper wick
  if (!shape.isHammer) return null;
  if (!shape.isBullish) return null; // Hammer should be bullish (green)

  // Calculate base confidence based on shape quality
  const lowerWickQuality = Math.min(1, shape.lowerWickRatio / 0.8); // Best at 80%+
  const upperWickQuality = shape.upperWickRatio < 0.05 ? 1 : 1 - shape.upperWickRatio * 2;
  const bodyQuality = shape.bodyRatio < 0.15 ? 1 : 1 - shape.bodyRatio * 2;

  const confidence = Math.round(
    (lowerWickQuality * 0.5 + upperWickQuality * 0.25 + bodyQuality * 0.25) * 100
  );

  // Context factors
  const contextFactors: ContextFactor[] = [
    {
      factor: 'Hammer Shape',
      description: 'Long lower wick with small body at top',
      bonus: 0,
      met: true,
    },
  ];

  return {
    name: 'Hammer',
    type: 'HAMMER',
    direction: 'BULLISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index],
    timestamp: candle.timestamp,
    explanation: 'Hammer pattern detected - bullish reversal signal with long lower shadow',
    contextFactors,
  };
}

/**
 * Detect inverted hammer pattern at specific index
 * Inverted hammer is a bullish reversal pattern with long upper wick
 */
export function detectInvertedHammer(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= candles.length) return null;

  const candle = candles[index]!;
  const prevCandle = index > 0 ? candles[index - 1] : undefined;
  const shape = analyzeCandleShape(candle, prevCandle);

  // Inverted Hammer: small body at bottom, long upper wick, little/no lower wick
  const isInvertedHammer =
    shape.upperWickRatio > HAMMER_LOWER_WICK_RATIO &&
    shape.lowerWickRatio < HAMMER_UPPER_WICK_RATIO &&
    shape.bodyRatio < HAMMER_BODY_RATIO_MAX &&
    shape.isBullish;

  if (!isInvertedHammer) return null;

  // Calculate base confidence
  const upperWickQuality = Math.min(1, shape.upperWickRatio / 0.8);
  const lowerWickQuality = shape.lowerWickRatio < 0.05 ? 1 : 1 - shape.lowerWickRatio * 2;
  const bodyQuality = shape.bodyRatio < 0.15 ? 1 : 1 - shape.bodyRatio * 2;

  const confidence = Math.round(
    (upperWickQuality * 0.5 + lowerWickQuality * 0.25 + bodyQuality * 0.25) * 100
  );

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Inverted Hammer Shape',
      description: 'Long upper wick with small body at bottom',
      bonus: 0,
      met: true,
    },
  ];

  return {
    name: 'Inverted Hammer',
    type: 'INVERTED_HAMMER',
    direction: 'BULLISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index],
    timestamp: candle.timestamp,
    explanation:
      'Inverted Hammer pattern detected - bullish reversal signal with long upper shadow',
    contextFactors,
  };
}
