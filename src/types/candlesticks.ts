/**
 * Candlestick Pattern Domain Types
 * Pattern detection with context-aware scoring
 */

export type PatternDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type PatternType =
  // Bullish
  | 'HAMMER'
  | 'INVERTED_HAMMER'
  | 'BULLISH_ENGULFING'
  | 'MORNING_STAR'
  | 'PIERCING_PATTERN'
  // Bearish
  | 'SHOOTING_STAR'
  | 'BEARISH_ENGULFING'
  | 'EVENING_STAR'
  | 'DARK_CLOUD_COVER'
  // Neutral/Context
  | 'DOJI'
  | 'SPINNING_TOP'
  | 'INSIDE_BAR';

export interface CandlestickPattern {
  name: string;
  type: PatternType;
  direction: PatternDirection;
  confidence: number; // 0-100 base confidence (pattern shape quality)
  contextScore: number; // 0-100 location/context bonus
  totalScore: number; // confidence + contextScore (capped at 100)
  candleIndexes: number[]; // indices of candles forming pattern (0 = latest)
  timestamp: number; // pattern completion timestamp
  explanation: string; // human-readable description
  contextFactors: ContextFactor[];
}

export interface ContextFactor {
  factor: string;
  description: string;
  bonus: number; // positive or negative
  met: boolean;
}

export interface PatternDetectionResult {
  patterns: CandlestickPattern[];
  bullishPatterns: CandlestickPattern[];
  bearishPatterns: CandlestickPattern[];
  neutralPatterns: CandlestickPattern[];
  strongestBullish?: CandlestickPattern;
  strongestBearish?: CandlestickPattern;
}

// Candle shape analysis (for pattern detection)
export interface CandleShape {
  bodySize: number; // |close - open|
  upperWick: number; // high - max(open, close)
  lowerWick: number; // min(open, close) - low
  totalRange: number; // high - low
  bodyRatio: number; // bodySize / totalRange
  upperWickRatio: number; // upperWick / totalRange
  lowerWickRatio: number; // lowerWick / totalRange
  isBullish: boolean;
  isBearish: boolean;
  isDoji: boolean; // bodyRatio < 0.1
  isHammer: boolean; // lowerWickRatio > 0.6, upperWickRatio < 0.1, body at top
  isShootingStar: boolean; // upperWickRatio > 0.6, lowerWickRatio < 0.1, body at bottom
  isEngulfing: boolean; // body engulfs previous body
  isInsideBar: boolean; // high <= prevHigh && low >= prevLow
}
