/**
 * Scoring Domain Types
 * Setup scoring weights, thresholds, and grade calculation
 */

export interface ScoreWeights {
  trend: number; // 20
  priceAction: number; // 20
  supportResistance: number; // 15
  candlestick: number; // 15
  volume: number; // 10
  momentum: number; // 10
  cpr: number; // 5
  riskReward: number; // 5
}

export interface ScoreThresholds {
  excellent: number; // 80
  strong: number; // 70
  moderate: number; // 60
  weak: number; // 50
  reject: number; // 0 (below weak)
}

export interface ScoreWeightsConfig {
  weights: ScoreWeights;
  thresholds: ScoreThresholds;
}

export interface SetupScore {
  breakdown: ScoreBreakdown;
  total: number;
  grade: SetupGrade;
  passed: boolean; // total >= thresholds.weak
}

export interface ScoreBreakdown {
  trend: number; // 0-20
  priceAction: number; // 0-20
  supportResistance: number; // 0-15
  candlestick: number; // 0-15
  volume: number; // 0-10
  momentum: number; // 0-10
  cpr: number; // 0-5
  riskReward: number; // 0-5
  total: number; // 0-100
}

export type SetupGrade = 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'REJECT';

export interface ScoringContext {
  // Trend scoring inputs
  trend: {
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number; // 0-100
    emaAlignment: 'BULLISH' | 'BEARISH' | 'MIXED';
    adxValue?: number;
    higherTimeframeAligned: boolean;
  };

  // Price Action scoring inputs
  priceAction: {
    structureType: string; // HH_HL, LH_LL, etc.
    breakoutDetected: boolean;
    breakoutStrength: number; // 0-100
    pullbackDetected: boolean;
    pullbackQuality: number; // 0-100
    bosDetected: boolean;
    chochDetected: boolean;
  };

  // S/R scoring inputs
  supportResistance: {
    nearSupport: boolean;
    nearResistance: boolean;
    supportStrength: number; // 0-100
    resistanceStrength: number; // 0-100
    zoneTouches: number;
    volumeAtZone: number;
  };

  // Candlestick scoring inputs
  candlestick: {
    strongestPattern: {
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      totalScore: number; // 0-100
      atKeyLevel: boolean;
    };
    patternCount: number;
    confirmationPatterns: number;
  };

  // Volume scoring inputs
  volume: {
    relativeVolume: number; // current / average
    volumeTrend: 'INCREASING' | 'DECREASING' | 'FLAT';
    breakoutVolumeConfirmed: boolean;
    climaxVolume: boolean;
  };

  // Momentum scoring inputs
  momentum: {
    rsi: number; // 0-100
    macdTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    macdHistogram: number;
    momentumAligned: boolean; // price & momentum same direction
  };

  // CPR scoring inputs
  cpr: {
    position: 'ABOVE' | 'BELOW' | 'INSIDE' | 'AT_BC' | 'AT_TC';
    classification: 'NARROW' | 'NORMAL' | 'WIDE';
    breakoutConfirmed: boolean;
    rejectionConfirmed: boolean;
    trendAligned: boolean;
  };

  // Risk/Reward scoring inputs
  riskReward: {
    ratio: number; // e.g., 2.5
    minAcceptable: number; // e.g., 1.5
    targetAchievable: boolean; // based on S/R
  };
}

// Default weights from PLAN.md §15
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  trend: 20,
  priceAction: 20,
  supportResistance: 15,
  candlestick: 15,
  volume: 10,
  momentum: 10,
  cpr: 5,
  riskReward: 5,
};

export const DEFAULT_SCORE_THRESHOLDS: ScoreThresholds = {
  excellent: 80,
  strong: 70,
  moderate: 60,
  weak: 50,
  reject: 0,
};

export const DEFAULT_SCORE_CONFIG: ScoreWeightsConfig = {
  weights: DEFAULT_SCORE_WEIGHTS,
  thresholds: DEFAULT_SCORE_THRESHOLDS,
};

export function calculateGrade(total: number, thresholds: ScoreThresholds): SetupGrade {
  if (total >= thresholds.excellent) return 'EXCELLENT';
  if (total >= thresholds.strong) return 'STRONG';
  if (total >= thresholds.moderate) return 'MODERATE';
  if (total >= thresholds.weak) return 'WEAK';
  return 'REJECT';
}

export function validateWeights(weights: ScoreWeights): boolean {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  return Math.abs(total - 100) < 0.01;
}
