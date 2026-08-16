/**
 * Shooting Star Pattern Detection
 * Bearish reversal pattern with long upper wick, small body at bottom
 */
import type { Candle } from '@/types/market-data';
import type { CandlestickPattern, ContextFactor } from '@/types/candlesticks';
import { analyzeCandleShape } from './hammer';

const SHOOTING_STAR_UPPER_WICK_RATIO = 0.6;
const SHOOTING_STAR_LOWER_WICK_RATIO = 0.1;
const SHOOTING_STAR_BODY_RATIO_MAX = 0.3;

/**
 * Detect shooting star pattern at specific index
 * Shooting star is a bearish reversal pattern
 */
export function detectShootingStar(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= candles.length) return null;

  const candle = candles[index]!;
  const prevCandle = index > 0 ? candles[index - 1] : undefined;
  const shape = analyzeCandleShape(candle, prevCandle);

  // Shooting Star: small body at bottom, long upper wick, little/no lower wick
  // Also must be bearish (red candle) for true shooting star
  const isShootingStar =
    shape.upperWickRatio > SHOOTING_STAR_UPPER_WICK_RATIO &&
    shape.lowerWickRatio < SHOOTING_STAR_LOWER_WICK_RATIO &&
    shape.bodyRatio < SHOOTING_STAR_BODY_RATIO_MAX &&
    shape.isBearish;

  if (!isShootingStar) return null;

  // Calculate base confidence based on shape quality
  const upperWickQuality = Math.min(1, shape.upperWickRatio / 0.8); // Best at 80%+
  const lowerWickQuality = shape.lowerWickRatio < 0.05 ? 1 : 1 - shape.lowerWickRatio * 2;
  const bodyQuality = shape.bodyRatio < 0.15 ? 1 : 1 - shape.bodyRatio * 2;

  const confidence = Math.round(
    (upperWickQuality * 0.5 + lowerWickQuality * 0.25 + bodyQuality * 0.25) * 100
  );

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Shooting Star Shape',
      description: 'Long upper wick with small body at bottom',
      bonus: 0,
      met: true,
    },
  ];

  return {
    name: 'Shooting Star',
    type: 'SHOOTING_STAR',
    direction: 'BEARISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index],
    timestamp: candle.timestamp,
    explanation: 'Shooting Star pattern detected - bearish reversal signal with long upper shadow',
    contextFactors,
  };
}
