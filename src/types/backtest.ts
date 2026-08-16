/**
 * Backtesting Domain Types
 * Historical simulation configuration, results, and trade records
 */

export interface BacktestConfig {
  // Universe
  symbols: string[];
  // Date Range
  startDate: Date;
  endDate: Date;
  // Strategy
  strategyType: StrategyType;
  strategyConfig: StrategyConfig;
  // Capital
  initialCapital: number;
  riskPercent: number;
  maxPositions: number;
  // Execution
  commissionPerTrade: number; // flat fee or percentage
  slippagePercent: number; // e.g., 0.1%
  // Filters
  minScore?: number;
  minRiskReward?: number;
  // Timeframes
  higherTimeframe: string;
  setupTimeframe: string;
  entryTimeframe: string;
}

export interface TradeRecord {
  // Identification
  tradeId: string;
  symbol: string;
  // Entry
  entryDate: Date;
  entryPrice: number;
  entrySignal: string; // e.g., 'BREAKOUT_CLOSE'
  // Exit
  exitDate?: Date;
  exitPrice?: number;
  exitSignal?: string; // 'TARGET_1', 'TARGET_2', 'TARGET_3', 'STOP_LOSS', 'TIME_EXIT', 'SIGNAL_EXIT'
  // Position
  direction: 'LONG' | 'SHORT';
  quantity: number;
  // Risk
  stopLoss: number;
  targets: number[];
  // Results
  pnl: number; // realized P&L
  pnlPercent: number; // P&L / entry capital
  rMultiple: number; // P&L / risk per share
  maxFavorableExcursion: number; // max profit during trade (R)
  maxAdverseExcursion: number; // max loss during trade (R)
  holdingPeriodDays: number;
  // Commission & Slippage
  commissionPaid: number;
  slippageCost: number;
}

export interface BacktestMetrics {
  // Trade Counts
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // winningTrades / totalTrades

  // P&L
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  netProfitPercent: number; // netProfit / initialCapital * 100

  // Risk Metrics
  profitFactor: number; // grossProfit / |grossLoss|
  expectancy: number; // avg R per trade
  averageWin: number; // avg R of winners
  averageLoss: number; // avg R of losers
  riskRewardRatio: number; // averageWin / |averageLoss|

  // Drawdown
  maxDrawdown: number; // max peak-to-trough % (capital)
  maxDrawdownDuration: number; // days
  currentDrawdown: number;

  // Trade Analysis
  largestWin: number; // max R
  largestLoss: number; // min R (negative)
  averageHoldingPeriod: number; // days
  consecutiveWins: number;
  consecutiveLosses: number;

  // Advanced - with exactOptionalPropertyTypes, use number | undefined
  sharpeRatio: number | undefined;
  sortinoRatio: number | undefined;
  calmarRatio: number | undefined;
  recoveryFactor: number | undefined; // netProfit / maxDrawdown
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: TradeRecord[];
  metrics: BacktestMetrics;
  equityCurve: EquityPoint[];
  dailyReturns: DailyReturn[];
  monthlyReturns: MonthlyReturn[];
  symbolPerformance: SymbolPerformance[];
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
}

export interface EquityPoint {
  date: Date;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface DailyReturn {
  date: Date;
  return: number; // daily P&L %
  equity: number;
}

export interface MonthlyReturn {
  year: number;
  month: number; // 1-12
  return: number;
  trades: number;
  winRate: number;
}

export interface SymbolPerformance {
  symbol: string;
  trades: number;
  winRate: number;
  netProfit: number;
  netProfitPercent: number;
  avgR: number;
  maxDrawdown: number;
}

// Import StrategyType and StrategyConfig
import type { StrategyType, StrategyConfig } from './strategy';
