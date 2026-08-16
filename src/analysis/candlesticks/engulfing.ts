/**
 * Engulfing Pattern Detection
 * Bullish/Bearish engulfing - second candle completely engulfs first candle's body
 */
import type { Candle } from '@/types/market-data';
import type { CandlestickPattern, ContextFactor } from '@/types/candlesticks';
import { analyzeCandleShape } from './hammer';

/**
 * Detect engulfing pattern (bullish or bearish) at specific index
 */
export function detectEngulfing(candles: Candle[], index: number): CandlestickPattern | null {
  if (index < 1 || index >= candles.length) return null;

  const currentCandle = candles[index]!;
  const prevCandle = candles[index - 1]!;

  const currentShape = analyzeCandleShape(currentCandle, prevCandle);
  const prevShape = analyzeCandleShape(prevCandle, undefined);

  // Bullish Engulfing: current is bullish, engulfs previous bearish body
  const isBullishEngulfing =
    currentShape.isBullish && prevShape.isBearish && currentShape.isEngulfing;

  // Bearish Engulfing: current is bearish, engulfs previous bullish body
  const isBearishEngulfing =
    currentShape.isBearish && prevShape.isBullish && currentShape.isEngulfing;

  if (!isBullishEngulfing && !isBearishEngulfing) return null;

  const direction = isBullishEngulfing ? 'BULLISH' : 'BEARISH';
  const type = isBullishEngulfing ? 'BULLISH_ENGULFING' : 'BEARISH_ENGULFING';

  // Calculate base confidence based on engulfing quality
  const prevBodySize = prevShape.bodySize;
  const currentBodySize = currentShape.bodySize;
  const engulfRatio = prevBodySize > 0 ? currentBodySize / prevBodySize : 1;

  // Higher confidence when engulfing is more complete
  const engulfQuality = Math.min(1, engulfRatio / 2); // 2x body = max quality

  // Also consider relative size of bodies
  const prevRange = prevShape.totalRange;
  const prevBodyRatio = prevRange > 0 ? prevBodySize / prevRange : 0;
  const prevBodyQuality = prevBodyRatio > 0.5 ? 1 : prevBodyRatio * 2; // Previous should have meaningful body

  const confidence = Math.round((engulfQuality * 0.6 + prevBodyQuality * 0.4) * 100);

  const contextFactors: ContextFactor[] = [
    {
      factor: 'Engulfing Pattern',
      description: `${direction === 'BULLISH' ? 'Bullish' : 'Bearish'} engulfing - second candle body completely covers first`,
      bonus: 0,
      met: true,
    },
  ];

  return {
    name: direction === 'BULLISH' ? 'Bullish Engulfing' : 'Bearish Engulfing',
    type,
    direction,
    confidence,
    contextScore: 0,
    totalScore: confidence,
    candleIndexes: [index - 1, index],
    timestamp: currentCandle.timestamp,
    explanation: `${direction === 'BULLISH' ? 'Bullish' : 'Bearish'} engulfing pattern - ${direction === 'BULLISH' ? 'buyers' : 'sellers'} overwhelm prior move`,
    contextFactors,
  };
}
