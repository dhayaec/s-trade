/**
 * Scoring Configuration with Zod Validation
 * 7-factor weighted scoring from PLAN.md §15
 */
import { z } from 'zod';

/**
 * Score weights (must sum to 100)
 */
export const ScoreWeightsSchema = z
  .object({
    trend: z.number().int().min(0).max(100).default(20),
    priceAction: z.number().int().min(0).max(100).default(20),
    supportResistance: z.number().int().min(0).max(100).default(15),
    candlestick: z.number().int().min(0).max(100).default(15),
    volume: z.number().int().min(0).max(100).default(10),
    momentum: z.number().int().min(0).max(100).default(10),
    cpr: z.number().int().min(0).max(100).default(5),
    riskReward: z.number().int().min(0).max(100).default(5),
  })
  .refine(
    (data: Record<string, number>) => {
      const sum = Object.values(data).reduce((a, b) => a + b, 0);
      return sum === 100;
    },
    { message: 'Score weights must sum to 100' }
  );

/**
 * Score thresholds for grading
 */
export const ScoreThresholdsSchema = z
  .object({
    excellent: z.number().int().min(0).max(100).default(80),
    strong: z.number().int().min(0).max(100).default(70),
    moderate: z.number().int().min(0).max(100).default(60),
    weak: z.number().int().min(0).max(100).default(50),
  })
  .refine(
    (data: { excellent: number; strong: number; moderate: number; weak: number }) =>
      data.excellent > data.strong && data.strong > data.moderate && data.moderate > data.weak,
    { message: 'Thresholds must be in descending order: excellent > strong > moderate > weak' }
  );

/**
 * Setup grade enum
 */
export const SetupGradeSchema = z.enum(['EXCELLENT', 'STRONG', 'MODERATE', 'WEAK', 'REJECT']);

/**
 * Default score weights
 */
export const DEFAULT_SCORE_WEIGHTS = ScoreWeightsSchema.parse({
  trend: 20,
  priceAction: 20,
  supportResistance: 15,
  candlestick: 15,
  volume: 10,
  momentum: 10,
  cpr: 5,
  riskReward: 5,
});

/**
 * Default score thresholds
 */
export const DEFAULT_SCORE_THRESHOLDS = ScoreThresholdsSchema.parse({
  excellent: 80,
  strong: 70,
  moderate: 60,
  weak: 50,
});

/**
 * Factor scoring configs
 */
export const FactorConfigSchema = z.object({
  // Trend factor (20 points)
  trend: z.object({
    htfBullish: z.number().default(20),
    htfBearish: z.number().default(0),
    htfNeutral: z.number().default(10),
    setupTimeframeAligned: z.number().default(10),
    entryTimeframeAligned: z.number().default(10),
  }),

  // Price Action factor (20 points)
  priceAction: z.object({
    bullishStructure: z.number().default(15),
    bearishStructure: z.number().default(0),
    ranging: z.number().default(5),
    bosConfirmed: z.number().default(10),
    chochConfirmed: z.number().default(-5),
  }),

  // Support/Resistance factor (15 points)
  supportResistance: z.object({
    atStrongSupport: z.number().default(15),
    nearSupport: z.number().default(10),
    atStrongResistance: z.number().default(0), // For longs
    nearResistance: z.number().default(5),
    zoneStrengthBonus: z.number().default(5),
    multipleTouches: z.number().default(5),
  }),

  // Candlestick factor (15 points)
  candlestick: z.object({
    bullishPatternConfirmed: z.number().default(15),
    bullishPatternWeak: z.number().default(8),
    bearishPattern: z.number().default(-5),
    dojiAtKeyLevel: z.number().default(10),
    volumeConfirmation: z.number().default(5),
  }),

  // Volume factor (10 points)
  volume: z.object({
    highVolumeBreakout: z.number().default(10),
    aboveAverage: z.number().default(5),
    average: z.number().default(2),
    belowAverage: z.number().default(0),
    volumeSpike: z.number().default(3),
  }),

  // Momentum factor (10 points)
  momentum: z.object({
    rsiBullish: z.number().default(10),
    rsiNeutral: z.number().default(5),
    rsiOverbought: z.number().default(-5),
    macdBullish: z.number().default(5),
    adxStrong: z.number().default(5),
  }),

  // CPR factor (5 points)
  cpr: z.object({
    priceAboveTC: z.number().default(5),
    priceAtPivot: z.number().default(3),
    priceAtBC: z.number().default(2),
    priceBelowBC: z.number().default(0),
    narrowCPR: z.number().default(3),
  }),

  // Risk/Reward factor (5 points)
  riskReward: z.object({
    rrAbove3: z.number().default(5),
    rr2To3: z.number().default(4),
    rr1_5To2: z.number().default(3),
    rr1To1_5: z.number().default(1),
    rrBelow1: z.number().default(-5),
  }),
});

/**
 * Build a default factor config by parsing the schema with explicit defaults.
 * Each inner field has its own default, so we pass those values directly.
 */
const DEFAULT_FACTOR_CONFIG = FactorConfigSchema.parse({
  trend: {},
  priceAction: {},
  supportResistance: {},
  candlestick: {},
  volume: {},
  momentum: {},
  cpr: {},
  riskReward: {},
});

export { DEFAULT_FACTOR_CONFIG };

/**
 * Calculate grade from score
 */
export function calculateGrade(score: number): z.infer<typeof SetupGradeSchema> {
  if (score >= DEFAULT_SCORE_THRESHOLDS.excellent) return 'EXCELLENT';
  if (score >= DEFAULT_SCORE_THRESHOLDS.strong) return 'STRONG';
  if (score >= DEFAULT_SCORE_THRESHOLDS.moderate) return 'MODERATE';
  if (score >= DEFAULT_SCORE_THRESHOLDS.weak) return 'WEAK';
  return 'REJECT';
}

/**
 * Validate score weights
 */
export function validateScoreWeights(weights: unknown) {
  return ScoreWeightsSchema.parse(weights);
}

/**
 * Validate score thresholds
 */
export function validateScoreThresholds(thresholds: unknown) {
  return ScoreThresholdsSchema.parse(thresholds);
}

/**
 * Score breakdown interface
 */
export interface ScoreBreakdown {
  trend: number;
  priceAction: number;
  supportResistance: number;
  candlestick: number;
  volume: number;
  momentum: number;
  cpr: number;
  riskReward: number;
  total: number;
  grade: z.infer<typeof SetupGradeSchema>;
}

/**
 * Create empty score breakdown
 */
export function createEmptyScoreBreakdown(): ScoreBreakdown {
  return {
    trend: 0,
    priceAction: 0,
    supportResistance: 0,
    candlestick: 0,
    volume: 0,
    momentum: 0,
    cpr: 0,
    riskReward: 0,
    total: 0,
    grade: 'REJECT',
  };
}
