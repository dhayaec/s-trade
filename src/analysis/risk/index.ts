/**
 * Risk Management Engine
 * Calculates entry, stop-loss, targets, position sizing, and risk/reward
 */
import type { AnalysisContext } from '@/types/strategy';
import type { TradingSetup, SetupDirection, SetupType } from '@/types/setup';
import {
  RiskParamsSchema,
  type RiskResult,
  DEFAULT_RISK_PARAMS,
  calculatePositionSize,
  calculateRTargets,
} from '@/config/risk';

export interface RiskEngineConfig {
  riskParams: ReturnType<typeof RiskParamsSchema.parse>;
}

export class RiskEngine {
  private config: RiskEngineConfig;

  constructor(config: RiskEngineConfig) {
    this.config = config;
  }

  /**
   * Calculate complete risk profile for a setup
   */
  calculateRisk(
    _context: AnalysisContext,
    setup: Omit<
      TradingSetup,
      | 'riskPerShare'
      | 'rewardPerShare'
      | 'riskReward'
      | 'positionSize'
      | 'capitalAtRisk'
      | 'potentialProfit'
      | 'maxLoss'
    >
  ): RiskResult {
    const { riskParams } = this.config;
    const direction = setup.direction;
    const entryPrice = setup.entry;
    const stopLoss = setup.stopLoss;
    const targets = setup.targets;

    // Calculate risk per share
    const riskPerShare = Math.abs(entryPrice - stopLoss);
    if (riskPerShare <= 0) {
      return this.createInvalidResult('Invalid entry/stop loss');
    }

    // Calculate reward per share (to first target)
    const firstTarget = targets[0];
    if (!firstTarget) {
      return this.createInvalidResult('No targets defined');
    }

    const rewardPerShare =
      direction === 'LONG' ? firstTarget - entryPrice : entryPrice - firstTarget;

    if (rewardPerShare <= 0) {
      return this.createInvalidResult('Invalid target price');
    }

    // Calculate risk/reward
    const riskRewardRatio = rewardPerShare / riskPerShare;

    // Check minimum R:R
    if (riskRewardRatio < riskParams.minRiskReward) {
      return this.createInvalidResult(
        `R:R ${riskRewardRatio.toFixed(2)} below minimum ${riskParams.minRiskReward}`
      );
    }

    // Check maximum R:R if set
    if (riskParams.maxRiskReward && riskRewardRatio > riskParams.maxRiskReward) {
      return this.createInvalidResult(
        `R:R ${riskRewardRatio.toFixed(2)} exceeds maximum ${riskParams.maxRiskReward}`
      );
    }

    // Calculate position size
    const positionSize = calculatePositionSize(
      entryPrice,
      stopLoss,
      riskParams.accountCapital,
      riskParams.riskPerTradePercent,
      riskParams.lotSize
    );

    if (positionSize <= 0) {
      return this.createInvalidResult('Position size calculation failed');
    }

    // Apply max position size constraint
    const finalPositionSize = riskParams.maxPositionSize
      ? Math.min(positionSize, riskParams.maxPositionSize)
      : positionSize;

    if (riskParams.minPositionSize && finalPositionSize < riskParams.minPositionSize) {
      return this.createInvalidResult('Position size below minimum');
    }

    // Calculate capital metrics
    const capitalAtRisk = riskParams.accountCapital * (riskParams.riskPerTradePercent / 100);
    const potentialProfit = rewardPerShare * finalPositionSize;
    const maxLoss = riskPerShare * finalPositionSize;

    return {
      entryPrice,
      stopLoss,
      targets,
      riskPerShare,
      rewardPerShare,
      riskRewardRatio,
      positionSize: finalPositionSize,
      capitalAtRisk,
      potentialProfit,
      maxLoss,
      valid: true,
    };
  }

  /**
   * Calculate stop loss based on type
   */
  calculateStopLoss(
    context: AnalysisContext,
    entryPrice: number,
    direction: SetupDirection,
    _setupType: SetupType,
    options?: {
      swingLow?: number;
      swingHigh?: number;
      atr?: number;
      breakoutZoneLow?: number;
      breakoutZoneHigh?: number;
    }
  ): number {
    const { riskParams } = this.config;
    const atr = options?.atr ?? context.indicators.setup.atr.atr;

    switch (riskParams.stopLossType) {
      case 'SWING_LOW':
        if (direction === 'LONG' && options?.swingLow) {
          return options.swingLow * 0.99; // 1% below swing low
        }
        if (direction === 'SHORT' && options?.swingHigh) {
          return options.swingHigh * 1.01; // 1% above swing high
        }
        // Fallback to ATR
        return direction === 'LONG'
          ? entryPrice - atr * riskParams.atrMultiplier
          : entryPrice + atr * riskParams.atrMultiplier;

      case 'ATR_BASED':
        return direction === 'LONG'
          ? entryPrice - atr * riskParams.atrMultiplier
          : entryPrice + atr * riskParams.atrMultiplier;

      case 'BREAKOUT_ZONE':
        if (direction === 'LONG' && options?.breakoutZoneLow && options?.breakoutZoneHigh) {
          return (
            options.breakoutZoneLow - (options.breakoutZoneHigh - options.breakoutZoneLow) * 0.1
          );
        }
        if (direction === 'SHORT' && options?.breakoutZoneHigh && options?.breakoutZoneLow) {
          return (
            options.breakoutZoneHigh + (options.breakoutZoneHigh - options.breakoutZoneLow) * 0.1
          );
        }
        return direction === 'LONG'
          ? entryPrice - atr * riskParams.atrMultiplier
          : entryPrice + atr * riskParams.atrMultiplier;

      case 'FIXED_PERCENT':
        return direction === 'LONG'
          ? entryPrice * (1 - riskParams.fixedStopLossPercent / 100)
          : entryPrice * (1 + riskParams.fixedStopLossPercent / 100);

      default:
        return direction === 'LONG'
          ? entryPrice - atr * riskParams.atrMultiplier
          : entryPrice + atr * riskParams.atrMultiplier;
    }
  }

  /**
   * Calculate targets based on type
   */
  calculateTargets(
    entryPrice: number,
    stopLoss: number,
    direction: SetupDirection,
    options?: {
      resistanceLevels?: number[];
      supportLevels?: number[];
      riskRewardTarget?: number;
    }
  ): number[] {
    const { riskParams } = this.config;

    switch (riskParams.targetType) {
      case 'R_BASED':
        return calculateRTargets(entryPrice, stopLoss, direction, riskParams.targetRMultipliers);

      case 'S_R_BASED':
        // Use support/resistance levels as targets
        const levels = direction === 'LONG' ? options?.resistanceLevels : options?.supportLevels;

        if (levels && levels.length > 0) {
          return levels
            .filter((l) => (direction === 'LONG' ? l > entryPrice : l < entryPrice))
            .slice(0, 3);
        }
        // Fallback to R-based
        return calculateRTargets(entryPrice, stopLoss, direction, riskParams.targetRMultipliers);

      case 'FIXED_R':
        if (options?.riskRewardTarget) {
          const risk = Math.abs(entryPrice - stopLoss);
          const targetDistance = risk * options.riskRewardTarget;
          return direction === 'LONG'
            ? [entryPrice + targetDistance]
            : [entryPrice - targetDistance];
        }
        return calculateRTargets(entryPrice, stopLoss, direction, [2]);

      default:
        return calculateRTargets(entryPrice, stopLoss, direction, riskParams.targetRMultipliers);
    }
  }

  /**
   * Calculate trailing stop loss
   */
  calculateTrailingStop(
    currentPrice: number,
    entryPrice: number,
    stopLoss: number,
    direction: SetupDirection,
    highestPriceSinceEntry: number,
    lowestPriceSinceEntry: number
  ): number {
    const { riskParams } = this.config;

    if (!riskParams.trailStopLoss) {
      return stopLoss;
    }

    const risk = Math.abs(entryPrice - stopLoss);
    const activationPrice =
      direction === 'LONG'
        ? entryPrice + risk * riskParams.trailActivationR
        : entryPrice - risk * riskParams.trailActivationR;

    // Check if trailing is activated
    const isActivated =
      direction === 'LONG' ? currentPrice >= activationPrice : currentPrice <= activationPrice;

    if (!isActivated) {
      return stopLoss;
    }

    // Calculate new trailing stop
    const trailDistance = risk * riskParams.trailDistanceR;
    const newStop =
      direction === 'LONG'
        ? highestPriceSinceEntry - trailDistance
        : lowestPriceSinceEntry + trailDistance;

    // Only move stop in favorable direction
    if (direction === 'LONG') {
      return Math.max(stopLoss, newStop);
    } else {
      return Math.min(stopLoss, newStop);
    }
  }

  /**
   * Validate risk parameters
   */
  validateRiskParams(params: unknown) {
    return RiskParamsSchema.parse(params);
  }

  /**
   * Merge with defaults
   */
  mergeWithDefaults(userParams: Partial<ReturnType<typeof RiskParamsSchema.parse>>) {
    return { ...DEFAULT_RISK_PARAMS, ...userParams };
  }

  private createInvalidResult(reason: string): RiskResult {
    return {
      entryPrice: 0,
      stopLoss: 0,
      targets: [],
      riskPerShare: 0,
      rewardPerShare: 0,
      riskRewardRatio: 0,
      positionSize: 0,
      capitalAtRisk: 0,
      potentialProfit: 0,
      maxLoss: 0,
      valid: false,
      rejectionReason: reason,
    };
  }
}

/**
 * Create a risk engine with default configuration
 */
export function createRiskEngine(
  riskParams?: Partial<ReturnType<typeof RiskParamsSchema.parse>>
): RiskEngine {
  const mergedParams = RiskParamsSchema.parse({ ...DEFAULT_RISK_PARAMS, ...riskParams });
  return new RiskEngine({ riskParams: mergedParams });
}
