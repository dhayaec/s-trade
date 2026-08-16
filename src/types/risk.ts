/**
 * Risk Management Domain Types
 * Entry, stop-loss, targets, position sizing, risk/reward
 */

export interface RiskParams {
  // Entry calculation
  entryType: 'BREAKOUT_CLOSE' | 'RETTEST' | 'CONFIRMATION_HIGH' | 'MARKET' | 'LIMIT';
  entryPrice?: number; // for LIMIT orders

  // Stop Loss
  stopLossType: 'SWING_LOW' | 'ATR_BASED' | 'BELOW_ZONE' | 'PERCENTAGE' | 'FIXED';
  atrMultiplier?: number; // e.g., 1.5 * ATR
  percentageBelow?: number; // e.g., 2% below entry
  fixedAmount?: number; // fixed rupee amount
  swingLookback?: number; // candles to look back for swing low

  // Targets
  targetType: 'R_MULTIPLE' | 'RESISTANCE' | 'FIBONACCI' | 'ATR_MULTIPLE';
  rMultiples?: number[]; // e.g., [1, 2, 3] for 1R, 2R, 3R
  atrMultipliers?: number[]; // e.g., [2, 3, 4] * ATR
  useResistanceLevels?: boolean;
  fibonacciLevels?: number[]; // e.g., [0.382, 0.618, 1.0]

  // Risk/Reward
  minRiskReward: number; // reject if below (default 1.5)
  maxRiskReward?: number; // optional cap

  // Position Sizing
  capital: number; // total capital
  riskPercent: number; // e.g., 2% of capital per trade
  maxPositionSize?: number; // max % of capital in single position
  lotSize?: number; // exchange lot size (round to nearest)
}

export interface RiskResult {
  entry: number;
  stopLoss: number;
  targets: number[];
  riskPerShare: number;
  rewardPerShare: number; // to first target
  riskReward: number;
  positionSize: PositionSize;
  valid: boolean;
  rejectionReason?: string;
}

export interface PositionSize {
  quantity: number; // number of shares/lots
  capitalAtRisk: number; // capital * riskPercent
  riskPerShare: number; // |entry - stopLoss|
  positionValue: number; // quantity * entry
  percentOfCapital: number; // positionValue / capital * 100
  roundedQuantity: number; // rounded to lot size
}

export interface RiskValidation {
  passed: boolean;
  checks: RiskCheck[];
}

export interface RiskCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

// Pre-calculated risk scenarios for quick evaluation
export interface RiskScenario {
  label: string;
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  positionSize: number;
  capitalRequired: number;
}
