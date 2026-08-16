/**
 * CPR (Central Pivot Range) Domain Types
 * Pivot levels, CPR classification, and CPR-based signals
 */

export type CPRClassification = 'NARROW' | 'NORMAL' | 'WIDE';

export type CPRPosition = 'ABOVE' | 'BELOW' | 'INSIDE' | 'AT_BC' | 'AT_TC';

export interface CPRData {
  pivot: number;
  bc: number; // Bottom Central
  tc: number; // Top Central
  width: number; // TC - BC
  widthPercent: number; // width / pivot * 100
  classification: CPRClassification;
  previousDay: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

export interface CPRLevels {
  // Traditional pivots
  r3: number;
  r2: number;
  r1: number;
  pivot: number;
  s1: number;
  s2: number;
  s3: number;
  // CPR
  tc: number;
  bc: number;
}

export interface CPRAnalysis {
  cpr: CPRData;
  levels: CPRLevels;
  currentPrice: number;
  position: CPRPosition;
  distanceToBC: number; // percent
  distanceToTC: number; // percent
  distanceToPivot: number; // percent
  // Signals
  breakout: CPRBreakoutSignal | null;
  rejection: CPRRejectionSignal | null;
  alignment: CPRTrendAlignment;
  multiDay: MultiDayCPR | null;
}

export interface CPRBreakoutSignal {
  direction: 'UP' | 'DOWN';
  breakoutCandleIndex: number;
  breakoutPrice: number;
  volumeConfirmed: boolean;
  strength: number; // 0-100
}

export interface CPRRejectionSignal {
  direction: 'UP' | 'DOWN'; // rejection direction (price rejected from)
  rejectionCandleIndex: number;
  rejectionPrice: number;
  candleType: string; // e.g., 'SHOOTING_STAR', 'DOJI'
  strength: number; // 0-100
}

export type CPRTrendAlignment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface MultiDayCPR {
  days: CPRData[]; // last N days
  narrowing: boolean; // CPR width decreasing
  widening: boolean; // CPR width increasing
  convergence: boolean; // price converging to CPR
  breakoutStreak: number; // consecutive days breaking same direction
}
