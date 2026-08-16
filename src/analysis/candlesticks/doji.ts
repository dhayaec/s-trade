/**
 * Doji and Inside Bar Pattern Detection
 * Neutral/Context patterns
 */
import type { Candle } from '@/types/market-data';
import type { CandlestickPattern, ContextFactor } from '@/types/candlesticks';
import { analyzeCandleShape } from './hammer';

const DOJI_BODY_RATIO_MAX = 0.1;

/**
 * Detect Doji pattern
 * Doji: very small body (open ≈ close), indicating indecision
 */
export function detectDoji(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= candles.length) return null;

  const candle = candles[index]!;
  const prevCandle = index > 0 ? candles[index - 1] : undefined;
  const shape = analyzeCandleShape(candle, prevCandle);

  // Doji: very small body relative to range
  if (!shape.isDoji) return null;

  // Determine doji type based on wick distribution
  let dojiType = 'DOJI';
  let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

  if (shape.upperWickRatio > 0.4 && shape.lowerWickRatio > 0.4) {
    dojiType = 'LONG_LEGGED_DOJI';
  } else if (shape.upperWickRatio > shape.lowerWickRatio * 2) {
    dojiType = 'GRAVESTONE_DOJI';
    direction = 'BEARISH';
  } else if (shape.lowerWickRatio > shape.upperWickRatio * 2) {
    dojiType = 'DRAGONFLY_DOJI';
    direction = 'BULLISH';
  }

  // Calculate confidence - doji confidence is based on how small the body is
  const bodyQuality = 1 - shape.bodyRatio / DOJI_BODY_RATIO_MAX;
  const wickBalance = 1 - Math.abs(shape.upperWickRatio - shape.lowerWickRatio);

  // Higher confidence for more distinct doji types
  const baseConfidence = Math.round((bodyQuality * 0.6 + wickBalance * 0.4) * 100);

  // Standard doji is neutral, gravestone/dragonfly have direction
  const contextFactors: ContextFactor[] = [
    {
      factor: dojiType.replace('_', ' '),
      description: `${dojiType} - ${direction === 'NEUTRAL' ? 'Indecision' : `${direction} bias`}`,
      bonus: 0,
      met: true,
    },
  ];

  return {
    name: dojiType.replace('_', ' '),
    type: 'DOJI',
    direction,
    confidence: baseConfidence,
    contextScore: 0,
    totalScore: baseConfidence,
    candleIndexes: [index],
    timestamp: candle.timestamp,
    explanation: `${dojiType} detected - market indecision${direction !== 'NEUTRAL' ? ` with ${direction.toLowerCase()} bias` : ''}`,
    contextFactors,
  };
}

/**
 * Detect Inside Bar pattern
 * Inside Bar: current candle completely within previous candle's range
 */
export function detectInsideBar(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 1 || index >= candles.length) return null;

  const currentCandle = candles[index]!;
  const prevCandle = candles[index - 1]!;

  const currentShape = analyzeCandleShape(currentCandle, prevCandle);

  // Inside Bar: high <= prevHigh && low >= prevLow
  if (!currentShape.isInsideBar) return null;

  // Inside bar direction follows the breakout direction (neutral until breakout)
  const direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

  // Calculate confidence based on how tight the inside bar is
  const prevRange = prevCandle.high - prevCandle.low;
  const currentRange = currentCandle.high - currentCandle.low;
  const tightness = prevRange > 0 ? 1 - currentRange / prevRange : 0;
  const tightnessQuality = Math.max(0, Math.min(1, tightness));

  const confidence = Math.round(tightnessQuality * 100);

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Inside Bar',
      description: 'Candle range completely within previous candle range',
      bonus: 0,
      met: true,
    },
    {
      factor: 'Tightness',
      description: `Inside bar is ${Math.round(tightness * 100)}% the size of parent candle`,
      bonus: tightness > 0.5 ? 5 : 0,
      met: tightness > 0.5,
    },
  ];

  return {
    name: 'Inside Bar',
    type: 'INSIDE_BAR',
    direction,
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index - 1, index],
    timestamp: currentCandle.timestamp,
    explanation: 'Inside Bar pattern - consolidation within prior range, await breakout',
    contextFactors,
  };
}

/**
 * Detect Spinning Top pattern
 * Spinning Top: small body with wicks on both sides
 */
export function detectSpinningTop(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= candles.length) return null;

  const candle = candles[index]!;
  const prevCandle = index > 0 ? candles[index - 1] : undefined;
  const shape = analyzeCandleShape(candle, prevCandle);

  // Spinning Top: small body, both wicks present
  const isSpinningTop =
    shape.bodyRatio < 0.3 &&
    shape.upperWickRatio > 0.2 &&
    shape.lowerWickRatio > 0.2 &&
    !shape.isDoji;

  if (!isSpinningTop) return null;

  const direction = shape.isBullish ? 'BULLISH' : shape.isBearish ? 'BEARISH' : 'NEUTRAL';

  // Confidence based on body smallness and wick balance
  const bodyQuality = 1 - shape.bodyRatio / 0.3;
  const wickBalance = 1 - Math.abs(shape.upperWickRatio - shape.lowerWickRatio);
  const confidence = Math.round((bodyQuality * 0.5 + wickBalance * 0.5) * 100);

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Spinning Top',
      description: 'Small body with upper and lower wicks - indecision',
      bonus: 0,
      met: true,
    },
  ];

  return {
    name: 'Spinning Top',
    type: 'SPINNING_TOP',
    direction,
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index],
    timestamp: candle.timestamp,
    explanation: `Spinning Top detected - market indecision${direction !== 'NEUTRAL' ? ` with slight ${direction.toLowerCase()} bias` : ''}`,
    contextFactors,
  };
}
