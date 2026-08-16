/**
 * Strategy Configuration with Zod Validation
 * Centralized strategy configs from PLAN.md §12
 */
import { z } from 'zod';
import type { StrategyType } from '@/types/strategy';

/**
 * Zod schema for StrategyConfig
 */
export const StrategyConfigSchema = z
  .object({
    minScore: z.number().int().min(0).max(100),
    minRiskReward: z.number().positive(),
    emaFast: z.number().int().positive(),
    emaSlow: z.number().int().positive(),
    emaTrend: z.number().int().positive(),
    requireEmaAlignment: z.boolean(),
    rsiPeriod: z.number().int().positive(),
    rsiMin: z.number().min(0).max(100).optional(),
    rsiMax: z.number().min(0).max(100).optional(),
    volumePeriod: z.number().int().positive(),
    volumeMultiplier: z.number().positive().optional(),
    atrPeriod: z.number().int().positive(),
    atrMultiplier: z.number().positive().optional(),
    useCPR: z.boolean(),
    cprAlignmentRequired: z.boolean(),
    requireCandlestickConfirmation: z.boolean(),
    minCandlestickScore: z.number().int().min(0).max(100),
    requireStructureConfirmation: z.boolean(),
    lookbackPeriod: z.number().int().positive(),
    higherTimeframe: z.string().min(1),
    setupTimeframe: z.string().min(1),
    entryTimeframe: z.string().min(1),
    requireHTFAlignment: z.boolean(),
  })
  .strict();

/**
 * Type inferred from schema
 */
export type ValidatedStrategyConfig = z.infer<typeof StrategyConfigSchema>;

/**
 * Default strategy configurations (matching Sprint 1 implementation)
 */
export const DEFAULT_STRATEGY_CONFIGS: Record<StrategyType, ValidatedStrategyConfig> = {
  BREAKOUT: {
    minScore: 65,
    minRiskReward: 1.5,
    emaFast: 20,
    emaSlow: 50,
    emaTrend: 200,
    requireEmaAlignment: true,
    rsiPeriod: 14,
    rsiMin: 50,
    rsiMax: 75,
    volumePeriod: 20,
    volumeMultiplier: 1.5,
    atrPeriod: 14,
    atrMultiplier: 1.5,
    useCPR: true,
    cprAlignmentRequired: false,
    requireCandlestickConfirmation: true,
    minCandlestickScore: 50,
    requireStructureConfirmation: true,
    lookbackPeriod: 10,
    higherTimeframe: '1d',
    setupTimeframe: '4h',
    entryTimeframe: '1h',
    requireHTFAlignment: true,
  },

  PULLBACK: {
    minScore: 60,
    minRiskReward: 1.5,
    emaFast: 20,
    emaSlow: 50,
    emaTrend: 200,
    requireEmaAlignment: true,
    rsiPeriod: 14,
    rsiMin: 40,
    rsiMax: 70,
    volumePeriod: 20,
    volumeMultiplier: 1.0,
    atrPeriod: 14,
    atrMultiplier: 1.0,
    useCPR: true,
    cprAlignmentRequired: false,
    requireCandlestickConfirmation: true,
    minCandlestickScore: 50,
    requireStructureConfirmation: true,
    lookbackPeriod: 10,
    higherTimeframe: '1d',
    setupTimeframe: '4h',
    entryTimeframe: '1h',
    requireHTFAlignment: true,
  },

  SUPPORT_BOUNCE: {
    minScore: 60,
    minRiskReward: 1.5,
    emaFast: 20,
    emaSlow: 50,
    emaTrend: 200,
    requireEmaAlignment: false,
    rsiPeriod: 14,
    rsiMin: 30,
    rsiMax: 60,
    volumePeriod: 20,
    volumeMultiplier: 1.5,
    atrPeriod: 14,
    atrMultiplier: 1.0,
    useCPR: true,
    cprAlignmentRequired: true,
    requireCandlestickConfirmation: true,
    minCandlestickScore: 60,
    requireStructureConfirmation: true,
    lookbackPeriod: 15,
    higherTimeframe: '1d',
    setupTimeframe: '4h',
    entryTimeframe: '1h',
    requireHTFAlignment: false,
  },

  REVERSAL: {
    minScore: 70,
    minRiskReward: 2.0,
    emaFast: 20,
    emaSlow: 50,
    emaTrend: 200,
    requireEmaAlignment: false,
    rsiPeriod: 14,
    rsiMin: 30,
    rsiMax: 50,
    volumePeriod: 20,
    volumeMultiplier: 2.0,
    atrPeriod: 14,
    atrMultiplier: 1.5,
    useCPR: true,
    cprAlignmentRequired: true,
    requireCandlestickConfirmation: true,
    minCandlestickScore: 70,
    requireStructureConfirmation: true,
    lookbackPeriod: 20,
    higherTimeframe: '1d',
    setupTimeframe: '4h',
    entryTimeframe: '1h',
    requireHTFAlignment: false,
  },
};

/**
 * Validate and parse strategy config
 */
export function validateStrategyConfig(config: unknown): ValidatedStrategyConfig {
  return StrategyConfigSchema.parse(config);
}

/**
 * Get default config for a strategy type
 */
export function getDefaultConfig(type: StrategyType): ValidatedStrategyConfig {
  return DEFAULT_STRATEGY_CONFIGS[type];
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(
  type: StrategyType,
  userConfig: Partial<ValidatedStrategyConfig>
): ValidatedStrategyConfig {
  const defaults = getDefaultConfig(type);
  return StrategyConfigSchema.parse({ ...defaults, ...userConfig });
}

/**
 * Timeframe validation schema
 */
export const TimeframeSchema = z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']);

/**
 * Validate timeframe
 */
export function validateTimeframe(tf: unknown): z.infer<typeof TimeframeSchema> {
  return TimeframeSchema.parse(tf);
}
