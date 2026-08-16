/**
 * Piercing Pattern / Dark Cloud Cover Detection
 * 2-candle reversal patterns
 */
import type { Candle } from '@/types/market-data';
import type { CandlestickPattern, ContextFactor } from '@/types/candlesticks';
import { analyzeCandleShape } from './hammer';

/**
 * Detect Piercing Pattern (bullish reversal)
 * Candle 1: Large bearish
 * Candle 2: Bullish, opens below c1 low, closes above c1 midpoint
 */
export function detectPiercingPattern(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 1 || index >= candles.length) return null;

  const c1 = candles[index - 1]!;
  const c2 = candles[index]!;

  const s1 = analyzeCandleShape(c1, undefined);
  const s2 = analyzeCandleShape(c2, c1);

  // Piercing Pattern conditions
  const c1Bearish = s1.isBearish && s1.bodyRatio > 0.5;
  const c2Bullish = s2.isBullish;
  const c2OpensBelow = c2.open < c1.low;
  const c1Midpoint = (c1.open + c1.close) / 2;
  const c2ClosesAboveMid = c2.close > c1Midpoint;
  const c2NotAboveOpen = c2.close < c1.open; // Should not completely engulf

  if (!(c1Bearish && c2Bullish && c2OpensBelow && c2ClosesAboveMid && c2NotAboveOpen)) return null;

  // Calculate confidence based on how far into c1 body c2 closes
  const penetrationDepth = (c2.close - c1Midpoint) / (c1Midpoint - c1.low);
  const penetrationQuality = Math.min(1, Math.max(0, penetrationDepth));

  const confidence = Math.round(
    (s1.bodyRatio * 0.4 + s2.bodyRatio * 0.3 + penetrationQuality * 0.3) * 100
  );

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Piercing Pattern',
      description: 'Bullish candle opens below prior low, closes above midpoint of bearish candle',
      bonus: 0,
      met: true,
    },
    {
      factor: 'Penetration Depth',
      description: `Closes ${Math.round(penetrationDepth * 100)}% into prior candle body`,
      bonus: penetrationDepth > 0.5 ? 5 : 0,
      met: penetrationDepth > 0.5,
    },
  ];

  return {
    name: 'Piercing Pattern',
    type: 'PIERCING_PATTERN',
    direction: 'BULLISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index - 1, index],
    timestamp: c2.timestamp,
    explanation: 'Piercing Pattern - bullish 2-candle reversal with strong penetration',
    contextFactors,
  };
}

/**
 * Detect Dark Cloud Cover (bearish reversal)
 * Candle 1: Large bullish
 * Candle 2: Bearish, opens above c1 high, closes below c1 midpoint
 */
export function detectDarkCloudCover(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 1 || index >= candles.length) return null;

  const c1 = candles[index - 1]!;
  const c2 = candles[index]!;

  const s1 = analyzeCandleShape(c1, undefined);
  const s2 = analyzeCandleShape(c2, c1);

  // Dark Cloud Cover conditions
  const c1Bullish = s1.isBullish && s1.bodyRatio > 0.5;
  const c2Bearish = s2.isBearish;
  const c2OpensAbove = c2.open > c1.high;
  const c1Midpoint = (c1.open + c1.close) / 2;
  const c2ClosesBelowMid = c2.close < c1Midpoint;
  const c2NotBelowOpen = c2.close > c1.open; // Should not completely engulf

  if (!(c1Bullish && c2Bearish && c2OpensAbove && c2ClosesBelowMid && c2NotBelowOpen)) return null;

  // Calculate confidence based on how far into c1 body c2 closes
  const penetrationDepth = (c1Midpoint - c2.close) / (c1.high - c1Midpoint);
  const penetrationQuality = Math.min(1, Math.max(0, penetrationDepth));

  const confidence = Math.round(
    (s1.bodyRatio * 0.4 + s2.bodyRatio * 0.3 + penetrationQuality * 0.3) * 100
  );

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Dark Cloud Cover',
      description: 'Bearish candle opens above prior high, closes below midpoint of bullish candle',
      bonus: 0,
      met: true,
    },
    {
      factor: 'Penetration Depth',
      description: `Closes ${Math.round(penetrationDepth * 100)}% into prior candle body`,
      bonus: penetrationDepth > 0.5 ? 5 : 0,
      met: penetrationDepth > 0.5,
    },
  ];

  return {
    name: 'Dark Cloud Cover',
    type: 'DARK_CLOUD_COVER',
    direction: 'BEARISH',
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index - 1, index],
    timestamp: c2.timestamp,
    explanation: 'Dark Cloud Cover - bearish 2-candle reversal with strong penetration',
    contextFactors,
  };
}
