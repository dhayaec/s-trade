/**
 * Price Action Domain Types
 * Market structure, swing points, support/resistance zones, breakouts, pullbacks
 */

export interface SwingPoint {
  index: number;
  price: number;
  type: 'HIGH' | 'LOW';
  timestamp: number;
  strength: number; // 0-100
  lookbackLeft: number;
  lookbackRight: number;
}

export type MarketStructureType =
  | 'HH_HL' // Higher Highs, Higher Lows (Uptrend)
  | 'LH_LL' // Lower Highs, Lower Lows (Downtrend)
  | 'HH_LL' // Higher Highs, Lower Lows (Expanding)
  | 'LH_HL' // Lower Highs, Higher Lows (Contracting)
  | 'RANGING' // No clear structure
  | 'UNKNOWN';

export interface MarketStructure {
  type: MarketStructureType;
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  lastSwingHigh?: SwingPoint;
  lastSwingLow?: SwingPoint;
  bosDetected: boolean; // Break of Structure
  chochDetected: boolean; // Change of Character
  bosLevel?: number;
  chochLevel?: number;
}

// Support/Resistance Zones (not single prices)
export interface PriceZone {
  lower: number;
  upper: number;
  center: number; // (lower + upper) / 2
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 0-100
  touches: number;
  timeframe: string;
  sources: ZoneSource[];
  firstTouch: number; // timestamp
  lastTouch: number; // timestamp
  volumeAtTouches: number[];
  isBroken: boolean;
  brokenAt?: number; // timestamp
}

export type ZoneSource =
  | 'SWING_HIGH'
  | 'SWING_LOW'
  | 'MULTIPLE_TOUCHES'
  | 'PREV_DAY_HIGH'
  | 'PREV_DAY_LOW'
  | 'PREV_WEEK_HIGH'
  | 'PREV_WEEK_LOW'
  | 'CPR_PIVOT'
  | 'CPR_BC'
  | 'CPR_TC'
  | 'PIVOT_R1'
  | 'PIVOT_S1'
  | 'PIVOT_R2'
  | 'PIVOT_S2'
  | 'CONSOLIDATION_TOP'
  | 'CONSOLIDATION_BOTTOM'
  | 'BREAKOUT_LEVEL'
  | 'EMA_20'
  | 'EMA_50'
  | 'EMA_200';

export interface SupportResistanceResult {
  supportZones: PriceZone[];
  resistanceZones: PriceZone[];
  allZones: PriceZone[];
}

// Breakout Detection
export interface Breakout {
  zone: PriceZone;
  breakoutCandleIndex: number;
  breakoutPrice: number;
  breakoutVolume: number;
  avgVolume: number;
  volumeMultiplier: number;
  closeAbove: boolean; // candle closed above resistance
  retested: boolean;
  retestCandleIndex?: number;
  strength: number; // 0-100
  type: 'RESISTANCE_BREAK' | 'RANGE_BREAK' | 'CONSOLIDATION_BREAK' | 'PREV_HIGH_BREAK';
}

export interface BreakoutResult {
  breakouts: Breakout[];
  currentBreakout?: Breakout; // most recent active breakout
}

// Pullback Detection
export interface Pullback {
  impulseStartIndex: number;
  impulseEndIndex: number;
  pullbackStartIndex: number;
  pullbackEndIndex: number;
  pullbackLowIndex: number;
  supportZone?: PriceZone;
  emaTouched?: 'EMA20' | 'EMA50' | 'EMA200';
  confirmationCandleIndex?: number;
  confirmationType?:
    'BULLISH_ENGULFING' | 'HAMMER' | 'MORNING_STAR' | 'PIERCING' | 'BULLISH_CANDLE';
  depth: number; // pullback depth as % of impulse
  depthCategory: 'SHALLOW' | 'NORMAL' | 'DEEP' | 'EXCESSIVE';
  strength: number; // 0-100
}

export interface PullbackResult {
  pullbacks: Pullback[];
  currentPullback?: Pullback;
  trendContext: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
}

// Consolidation / Range
export interface ConsolidationRange {
  high: number;
  low: number;
  startIndex: number;
  endIndex: number;
  duration: number; // number of candles
  touches: number;
  volumeProfile: 'DECREASING' | 'FLAT' | 'INCREASING';
  breakoutDirection?: 'UP' | 'DOWN';
  breakoutIndex?: number;
}
