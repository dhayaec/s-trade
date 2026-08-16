/**
 * Risk Configuration with Zod Validation
 * Risk management parameters from PLAN.md §14, §25
 */
import { z } from 'zod';

/**
 * Risk parameters schema
 */
export const RiskParamsSchema = z.object({
  // Capital and position sizing
  accountCapital: z.number().positive(),
  riskPerTradePercent: z.number().min(0.1).max(10).default(2), // 2% default
  maxRiskPerTrade: z.number().positive().optional(),

  // Stop loss
  stopLossType: z
    .enum(['SWING_LOW', 'ATR_BASED', 'BREAKOUT_ZONE', 'FIXED_PERCENT'])
    .default('SWING_LOW'),
  atrMultiplier: z.number().positive().default(1.5),
  fixedStopLossPercent: z.number().min(0.1).max(20).default(5),

  // Targets
  targetType: z.enum(['R_BASED', 'S_R_BASED', 'FIXED_R']).default('R_BASED'),
  targetRMultipliers: z.array(z.number().positive()).default([1, 2, 3]),
  fixedTargetPercent: z.number().positive().optional(),

  // Risk/Reward
  minRiskReward: z.number().positive().default(1.5),
  maxRiskReward: z.number().positive().optional(),

  // Position constraints
  maxPositionSize: z.number().positive().optional(),
  minPositionSize: z.number().nonnegative().default(1),
  lotSize: z.number().int().positive().default(1),

  // Trade management
  allowPartialExits: z.boolean().default(true),
  trailStopLoss: z.boolean().default(false),
  trailActivationR: z.number().positive().default(1),
  trailDistanceR: z.number().positive().default(0.5),

  // Time-based
  maxHoldDays: z.number().int().positive().default(30),
  intradayOnly: z.boolean().default(false),
});

/**
 * Risk result interface
 */
export interface RiskResult {
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  riskPerShare: number;
  rewardPerShare: number;
  riskRewardRatio: number;
  positionSize: number;
  capitalAtRisk: number;
  potentialProfit: number;
  maxLoss: number;
  valid: boolean;
  rejectionReason?: string;
}

/**
 * Default risk parameters
 */
export const DEFAULT_RISK_PARAMS = RiskParamsSchema.parse({
  accountCapital: 100000,
  riskPerTradePercent: 2,
  stopLossType: 'SWING_LOW',
  atrMultiplier: 1.5,
  fixedStopLossPercent: 5,
  targetType: 'R_BASED',
  targetRMultipliers: [1, 2, 3],
  minRiskReward: 1.5,
  maxRiskReward: 10,
  lotSize: 1,
  allowPartialExits: true,
  trailStopLoss: false,
  trailActivationR: 1,
  trailDistanceR: 0.5,
  maxHoldDays: 30,
  intradayOnly: false,
});

/**
 * Validate risk parameters
 */
export function validateRiskParams(params: unknown) {
  return RiskParamsSchema.parse(params);
}

/**
 * Merge user risk params with defaults
 */
export function mergeWithDefaults(userParams: Partial<z.infer<typeof RiskParamsSchema>>) {
  return RiskParamsSchema.parse({ ...DEFAULT_RISK_PARAMS, ...userParams });
}

/**
 * Calculate position size based on risk
 */
export function calculatePositionSize(
  entryPrice: number,
  stopLoss: number,
  accountCapital: number,
  riskPerTradePercent: number,
  lotSize: number = 1
): number {
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  if (riskPerShare <= 0) return 0;

  const capitalAtRisk = accountCapital * (riskPerTradePercent / 100);
  const rawPositionSize = capitalAtRisk / riskPerShare;
  const positionSize = Math.floor(rawPositionSize / lotSize) * lotSize;

  return Math.max(0, positionSize);
}

/**
 * Calculate R-multiple targets
 */
export function calculateRTargets(
  entryPrice: number,
  stopLoss: number,
  direction: 'LONG' | 'SHORT',
  rMultipliers: number[] = [1, 2, 3]
): number[] {
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  if (riskPerShare <= 0) return [];

  return rMultipliers.map((r) => {
    const targetDistance = riskPerShare * r;
    return direction === 'LONG' ? entryPrice + targetDistance : entryPrice - targetDistance;
  });
}

/**
 * Calculate risk/reward ratio
 */
export function calculateRiskReward(
  entryPrice: number,
  stopLoss: number,
  targets: number[],
  direction: 'LONG' | 'SHORT'
): number {
  const risk = Math.abs(entryPrice - stopLoss);
  if (risk <= 0 || targets.length === 0) return 0;

  const firstTarget = targets[0] as number;
  const reward = direction === 'LONG' ? firstTarget - entryPrice : entryPrice - firstTarget;

  return reward / risk;
}
