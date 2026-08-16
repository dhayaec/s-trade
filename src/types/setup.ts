/**
 * Trading Setup Domain Types
 * Complete setup structure with entry, SL, targets, scoring, and explanation
 */

export type SetupDirection = 'LONG' | 'SHORT';

export type SetupType =
  'BREAKOUT' | 'PULLBACK' | 'REVERSAL' | 'SUPPORT_BOUNCE' | 'RESISTANCE_REJECTION';

export interface Confirmation {
  factor: string;
  description: string;
  weight: number; // contribution to score (0-100)
  met: boolean;
}

export interface Invalidation {
  condition: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
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

export interface TradingSetup {
  // Identity
  symbol: string;
  timeframe: string; // e.g., "4H", "1D"
  generatedAt: number; // Unix ms

  // Direction & Type
  direction: SetupDirection;
  setupType: SetupType;

  // Price Levels
  entry: number;
  stopLoss: number;
  targets: number[]; // [target1, target2, target3]

  // Risk Metrics
  riskPerShare: number;
  rewardPerShare: number; // to target1
  riskReward: number; // rewardPerShare / riskPerShare

  // Scoring
  confidenceScore: number; // 0-100 (alias for scoreBreakdown.total)
  scoreBreakdown: ScoreBreakdown;
  grade: SetupGrade;

  // Component Scores (for detailed display)
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  priceActionScore: number;
  candlestickScore: number;
  indicatorScore: number;

  // Confirmations & Invalidations
  confirmations: Confirmation[];
  invalidations: Invalidation[];

  // Market Context
  marketRegime: MarketRegime;
  trend: TrendAnalysis;

  // Explanation
  explanation: string; // Human-readable "Why this setup?"
}

export type MarketRegime =
  'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGE_BOUND' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';

export interface TrendAnalysis {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100
  emaAlignment: 'BULLISH' | 'BEARISH' | 'MIXED';
  structure: 'HH_HL' | 'LH_LL' | 'MIXED'; // Higher High/Higher Low vs Lower High/Lower Low
  adxValue?: number;
}

export interface SetupFilters {
  minScore?: number;
  minRiskReward?: number;
  maxRiskReward?: number;
  setupTypes?: SetupType[];
  directions?: SetupDirection[];
  marketRegimes?: MarketRegime[];
  trendDirections?: TrendAnalysis['direction'][];
  minVolumeMultiplier?: number;
}
