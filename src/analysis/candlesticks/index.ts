/**
 * Candlestick Patterns Module - Main Export
 * 11 patterns with context-aware scoring
 */
import type { Candle } from '@/types/market-data';
import type {
  CandlestickPattern,
  PatternDetectionResult,
  ContextFactor,
} from '@/types/candlesticks';

import { detectHammer, detectInvertedHammer, analyzeCandleShape } from './hammer';
import { detectEngulfing } from './engulfing';
import { detectMorningStar, detectEveningStar } from './star';
import { detectPiercingPattern, detectDarkCloudCover } from './piercing';
import { detectShootingStar } from './shooting-star';
import { detectDoji, detectInsideBar, detectSpinningTop } from './doji';

/**
 * Context factors for pattern scoring
 */
export interface PatternContext {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  atSupport: boolean;
  atResistance: boolean;
  nearEMA: boolean;
  volumeConfirmation: boolean;
  rsiLevel?: number; // 0-100
  marketStructure?: 'HH_HL' | 'LH_LL' | 'RANGING';
}

/**
 * Calculate context score for a pattern
 * Context factors can add/subtract from base confidence
 */
export function calculateContextScore(
  pattern: CandlestickPattern,
  context: PatternContext
): { contextScore: number; contextFactors: ContextFactor[] } {
  const factors: ContextFactor[] = [];
  let score = 0;

  // 1. Trend Alignment
  if (
    (pattern.direction === 'BULLISH' && context.trend === 'BULLISH') ||
    (pattern.direction === 'BEARISH' && context.trend === 'BEARISH')
  ) {
    factors.push({
      factor: 'Trend Alignment',
      description: `Pattern direction aligns with ${context.trend.toLowerCase()} trend`,
      bonus: 15,
      met: true,
    });
    score += 15;
  } else if (pattern.direction !== 'NEUTRAL' && context.trend !== 'NEUTRAL') {
    factors.push({
      factor: 'Counter-Trend',
      description: `Pattern opposes ${context.trend.toLowerCase()} trend`,
      bonus: -15,
      met: true,
    });
    score -= 15;
  }

  // 2. Support/Resistance Location
  if (pattern.direction === 'BULLISH' && context.atSupport) {
    factors.push({
      factor: 'At Support',
      description: 'Bullish pattern forms at key support zone',
      bonus: 20,
      met: true,
    });
    score += 20;
  } else if (pattern.direction === 'BEARISH' && context.atResistance) {
    factors.push({
      factor: 'At Resistance',
      description: 'Bearish pattern forms at key resistance zone',
      bonus: 20,
      met: true,
    });
    score += 20;
  } else if (pattern.direction === 'BULLISH' && context.atResistance) {
    factors.push({
      factor: 'At Resistance (Bullish)',
      description: 'Bullish pattern at resistance - potential false breakout',
      bonus: -10,
      met: true,
    });
    score -= 10;
  } else if (pattern.direction === 'BEARISH' && context.atSupport) {
    factors.push({
      factor: 'At Support (Bearish)',
      description: 'Bearish pattern at support - potential false breakdown',
      bonus: -10,
      met: true,
    });
    score -= 10;
  }

  // 3. EMA Proximity
  if (pattern.direction === 'BULLISH' && context.nearEMA) {
    factors.push({
      factor: 'Near EMA',
      description: 'Bullish pattern near rising EMA support',
      bonus: 10,
      met: true,
    });
    score += 10;
  } else if (pattern.direction === 'BEARISH' && context.nearEMA) {
    factors.push({
      factor: 'Near EMA',
      description: 'Bearish pattern near falling EMA resistance',
      bonus: 10,
      met: true,
    });
    score += 10;
  }

  // 4. Volume Confirmation
  if (context.volumeConfirmation) {
    factors.push({
      factor: 'Volume Confirmation',
      description: 'Above-average volume on pattern completion',
      bonus: 10,
      met: true,
    });
    score += 10;
  }

  // 5. RSI Context
  if (context.rsiLevel !== undefined) {
    if (pattern.direction === 'BULLISH' && context.rsiLevel < 30) {
      factors.push({
        factor: 'Oversold RSI',
        description: `RSI at ${context.rsiLevel} - oversold bounce potential`,
        bonus: 10,
        met: true,
      });
      score += 10;
    } else if (pattern.direction === 'BEARISH' && context.rsiLevel > 70) {
      factors.push({
        factor: 'Overbought RSI',
        description: `RSI at ${context.rsiLevel} - overbought rejection potential`,
        bonus: 10,
        met: true,
      });
      score += 10;
    } else if (pattern.direction === 'BULLISH' && context.rsiLevel > 70) {
      factors.push({
        factor: 'Overbought RSI (Bullish)',
        description: `RSI at ${context.rsiLevel} - limited upside room`,
        bonus: -5,
        met: true,
      });
      score -= 5;
    } else if (pattern.direction === 'BEARISH' && context.rsiLevel < 30) {
      factors.push({
        factor: 'Oversold RSI (Bearish)',
        description: `RSI at ${context.rsiLevel} - limited downside room`,
        bonus: -5,
        met: true,
      });
      score -= 5;
    }
  }

  // 6. Market Structure
  if (context.marketStructure) {
    if (pattern.direction === 'BULLISH' && context.marketStructure === 'HH_HL') {
      factors.push({
        factor: 'Bullish Structure',
        description: 'Pattern in HH/HL uptrend structure',
        bonus: 10,
        met: true,
      });
      score += 10;
    } else if (pattern.direction === 'BEARISH' && context.marketStructure === 'LH_LL') {
      factors.push({
        factor: 'Bearish Structure',
        description: 'Pattern in LH/LL downtrend structure',
        bonus: 10,
        met: true,
      });
      score += 10;
    } else if (pattern.direction !== 'NEUTRAL' && context.marketStructure === 'RANGING') {
      factors.push({
        factor: 'Ranging Market',
        description: 'Pattern in ranging market - lower reliability',
        bonus: -5,
        met: true,
      });
      score -= 5;
    }
  }

  // Cap context score
  score = Math.max(-50, Math.min(50, score));

  return { contextScore: score, contextFactors: factors };
}

/**
 * Apply context scoring to a pattern
 */
export function applyContextScore(
  pattern: CandlestickPattern,
  context: PatternContext
): CandlestickPattern {
  const { contextScore, contextFactors } = calculateContextScore(pattern, context);
  const totalScore = Math.max(0, Math.min(100, pattern.confidence + contextScore));

  return {
    ...pattern,
    contextScore,
    totalScore,
    contextFactors: [...pattern.contextFactors, ...contextFactors],
  };
}

/**
 * Detect all candlestick patterns in a series
 */
export function detectCandlestickPatterns(
  candles: Candle[],
  context?: PatternContext
): CandlestickPattern[] {
  if (candles.length < 3) return [];

  const patterns: CandlestickPattern[] = [];

  // Check each candle for single-candle patterns
  for (let i = 0; i < candles.length; i++) {
    const hammer = detectHammer(candles, i);
    if (hammer) patterns.push(hammer);

    const invertedHammer = detectInvertedHammer(candles, i);
    if (invertedHammer) patterns.push(invertedHammer);

    const shootingStar = detectShootingStar(candles, i);
    if (shootingStar) patterns.push(shootingStar);

    const doji = detectDoji(candles, i);
    if (doji) patterns.push(doji);

    const spinningTop = detectSpinningTop(candles, i);
    if (spinningTop) patterns.push(spinningTop);
  }

  // Check each pair for 2-candle patterns
  for (let i = 1; i < candles.length; i++) {
    const engulfing = detectEngulfing(candles, i);
    if (engulfing) patterns.push(engulfing);

    const piercing = detectPiercingPattern(candles, i);
    if (piercing) patterns.push(piercing);

    const darkCloud = detectDarkCloudCover(candles, i);
    if (darkCloud) patterns.push(darkCloud);

    const insideBar = detectInsideBar(candles, i);
    if (insideBar) patterns.push(insideBar);
  }

  // Check each triplet for 3-candle patterns
  for (let i = 2; i < candles.length; i++) {
    const morningStar = detectMorningStar(candles, i);
    if (morningStar) patterns.push(morningStar);

    const eveningStar = detectEveningStar(candles, i);
    if (eveningStar) patterns.push(eveningStar);
  }

  // Apply context scoring if provided
  if (context) {
    return patterns.map((p) => applyContextScore(p, context));
  }

  return patterns;
}

/**
 * Get pattern detection result with categorization
 */
export function getPatternDetectionResult(
  candles: Candle[],
  context?: PatternContext
): PatternDetectionResult {
  const patterns = detectCandlestickPatterns(candles, context);

  const bullishPatterns = patterns.filter((p) => p.direction === 'BULLISH');
  const bearishPatterns = patterns.filter((p) => p.direction === 'BEARISH');
  const neutralPatterns = patterns.filter((p) => p.direction === 'NEUTRAL');

  const strongestBullish =
    bullishPatterns.length > 0
      ? bullishPatterns.reduce(
          (max, p) => (p.totalScore > max.totalScore ? p : max),
          bullishPatterns[0]!
        )
      : undefined;
  const strongestBearish =
    bearishPatterns.length > 0
      ? bearishPatterns.reduce(
          (max, p) => (p.totalScore > max.totalScore ? p : max),
          bearishPatterns[0]!
        )
      : undefined;

  return {
    patterns,
    bullishPatterns,
    bearishPatterns,
    neutralPatterns,
    strongestBullish,
    strongestBearish,
  };
}

// Re-export individual detectors for granular usage
export {
  detectHammer,
  detectInvertedHammer,
  detectEngulfing,
  detectMorningStar,
  detectEveningStar,
  detectPiercingPattern,
  detectDarkCloudCover,
  detectShootingStar,
  detectDoji,
  detectInsideBar,
  detectSpinningTop,
  analyzeCandleShape,
};
