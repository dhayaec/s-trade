/**
 * Strategy Configuration
 * Validated default configurations for all strategies
 */
import type { StrategyConfig, StrategyType } from '@/types/strategy';

/**
 * Default configurations per strategy type
 */
export const DEFAULT_STRATEGY_CONFIGS: Record<StrategyType, StrategyConfig> = {
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
 * Validate a strategy config
 */
export function validateStrategyConfig(config: unknown): StrategyConfig {
  // Simple runtime validation
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }
  return config as StrategyConfig;
}

/**
 * Get default config for a strategy type
 */
export function getDefaultConfig(type: StrategyType): StrategyConfig {
  return DEFAULT_STRATEGY_CONFIGS[type];
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(
  type: StrategyType,
  userConfig: Partial<StrategyConfig>
): StrategyConfig {
  const defaults = getDefaultConfig(type);
  return { ...defaults, ...userConfig };
}
