/**
 * Metrics Calculator
 * Computes performance metrics from a list of completed trade records.
 */
import type { TradeRecord, BacktestMetrics } from '@/types/backtest';

/**
 * Number of milliseconds in a day
 */
const MS_PER_DAY = 86_400_000;

/**
 * Round to 2 decimal places
 */
function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Calculate performance metrics from a list of completed trades.
 *
 * @param trades - Completed trade records (must have exit data)
 * @param initialCapital - Starting capital used for percentage metrics
 * @returns Aggregated backtest metrics
 */
export function calculateMetrics(trades: TradeRecord[], initialCapital: number): BacktestMetrics {
  const closedTrades = trades.filter((t) => t.exitDate !== undefined && t.exitPrice !== undefined);

  const totalTrades = closedTrades.length;

  if (totalTrades === 0) {
    return createEmptyMetrics();
  }

  const rMultiples = closedTrades.map((t) => t.rMultiple);
  const pnls = closedTrades.map((t) => t.pnl);

  const winningTrades = closedTrades.filter((t) => t.pnl > 0);
  const losingTrades = closedTrades.filter((t) => t.pnl <= 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

  const netProfit = grossProfit - grossLoss;

  const winRate = (winningTrades.length / totalTrades) * 100;

  const profitFactor =
    grossLoss === 0 ? (grossProfit > 0 ? Number.POSITIVE_INFINITY : 0) : grossProfit / grossLoss;

  // R-multiple based metrics (expectancy = avg R per trade)
  const expectancy = rMultiples.reduce((sum, r) => sum + r, 0) / (totalTrades || 1);

  const averageWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.rMultiple, 0) / winningTrades.length
      : 0;

  const averageLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.rMultiple, 0) / losingTrades.length
      : 0;

  const riskRewardRatio =
    averageLoss !== 0
      ? Math.abs(averageWin / averageLoss)
      : averageWin > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  const largestWin = rMultiples.length > 0 ? Math.max(...rMultiples) : 0;
  const largestLoss = rMultiples.length > 0 ? Math.min(...rMultiples) : 0;

  const netProfitPercent = initialCapital > 0 ? (netProfit / initialCapital) * 100 : 0;

  // Holding period (average in days)
  const holdingPeriods = closedTrades.map((t) => t.holdingPeriodDays);
  const averageHoldingPeriod = holdingPeriods.reduce((sum, d) => sum + d, 0) / (totalTrades || 1);

  // Consecutive wins / losses (in trade sequence order)
  const { consecutiveWins, consecutiveLosses } = calculateStreaks(pnls);

  // Drawdown (peak-to-trough on cumulative equity)
  const drawdown = calculateDrawdown(pnls);

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: round2(winRate),

    grossProfit: round2(grossProfit),
    grossLoss: round2(grossLoss),
    netProfit: round2(netProfit),
    netProfitPercent: round2(netProfitPercent),

    profitFactor: profitFactor === Infinity ? Number.POSITIVE_INFINITY : round2(profitFactor),
    expectancy: round2(expectancy),
    averageWin: round2(averageWin),
    averageLoss: round2(averageLoss),
    riskRewardRatio:
      riskRewardRatio === Infinity ? Number.POSITIVE_INFINITY : round2(riskRewardRatio),

    maxDrawdown: round2(drawdown.maxDrawdown),
    maxDrawdownDuration: drawdown.maxDrawdownDuration,
    currentDrawdown: round2(drawdown.currentDrawdown),

    largestWin: round2(largestWin),
    largestLoss: round2(largestLoss),
    averageHoldingPeriod: round2(averageHoldingPeriod),
    consecutiveWins,
    consecutiveLosses,

    sharpeRatio: undefined,
    sortinoRatio: undefined,
    calmarRatio: undefined,
    recoveryFactor: drawdown.maxDrawdown > 0 ? round2(netProfit / drawdown.maxDrawdown) : undefined,
  };
}

/**
 * Compute longest consecutive winning and losing streaks.
 */
function calculateStreaks(pnls: number[]): {
  consecutiveWins: number;
  consecutiveLosses: number;
} {
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let consecutiveWins = 0;
  let consecutiveLosses = 0;

  for (const pnl of pnls) {
    if (pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
    } else {
      currentLossStreak += 1;
      currentWinStreak = 0;
      consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
    }
  }

  return { consecutiveWins, consecutiveLosses };
}

/**
 * Walk through trades sequentially, computing running equity and drawdown.
 * Returns max drawdown (% of running peak), its duration in days, and the
 * current (end-of-series) drawdown.
 */
export function calculateDrawdown(pnls: number[]): {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  currentDrawdown: number;
} {
  if (pnls.length === 0) {
    return { maxDrawdown: 0, maxDrawdownDuration: 0, currentDrawdown: 0 };
  }

  // Use a synthetic equity of 100 to express drawdowns as percentages.
  const startEquity = 100;
  let equity = startEquity;
  let peak = startEquity;
  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;
  let currentDuration = 0;

  for (const pnl of pnls) {
    // Express each pnl as a % move relative to the synthetic equity unit.
    const pnlPercent = (pnl / startEquity) * 100;
    equity = equity + pnlPercent;
    if (equity > peak) {
      peak = equity;
      currentDuration = 0;
    } else {
      currentDuration += 1;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownDuration = currentDuration;
      }
    }
  }

  const currentDrawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

  return {
    maxDrawdown: round2(Math.max(0, maxDrawdown)),
    maxDrawdownDuration,
    currentDrawdown: round2(Math.max(0, currentDrawdown)),
  };
}

/**
 * Compute the Sharpe ratio from a series of periodic (e.g., daily) returns.
 *
 * @param returns - Array of period returns as fractions (0.01 = +1%)
 * @param riskFreeRate - Annual risk-free rate as a fraction (default 0)
 * @returns Annualized Sharpe ratio, or undefined if not enough data
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0
): number | undefined {
  if (returns.length < 2) return undefined;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return undefined;

  const dailyRiskFree = riskFreeRate / 252;
  const sharpe = (mean - dailyRiskFree) / stdDev;
  // Annualize (daily returns, 252 trading days)
  return round2(sharpe * Math.sqrt(252));
}

/**
 * Compute the Sortino ratio from a series of periodic returns (downside-only
 * deviation).
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0
): number | undefined {
  if (returns.length < 2) return undefined;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const dailyRiskFree = riskFreeRate / 252;

  const downside = returns
    .map((r) => Math.min(0, r - dailyRiskFree))
    .reduce((sum, d) => sum + d * d, 0);
  const downsideDeviation = Math.sqrt(downside / returns.length);
  if (downsideDeviation === 0) return undefined;

  const sortino = (mean - dailyRiskFree) / downsideDeviation;
  return round2(sortino * Math.sqrt(252));
}

/**
 * Compute the Calmar ratio: annualized return / max drawdown.
 *
 * @param annualizedReturn - Annualized return as a fraction
 * @param maxDrawdown - Max drawdown as a fraction (positive number)
 */
export function calculateCalmarRatio(
  annualizedReturn: number,
  maxDrawdown: number
): number | undefined {
  if (maxDrawdown <= 0) return undefined;
  return round2(annualizedReturn / maxDrawdown);
}

/**
 * Build a daily returns series (in percent) from a list of completed trades.
 * Trades are bucketed by their exit date; each day's return is the day's total
 * P&L relative to the provided equity base.
 */
export function buildDailyReturns(trades: TradeRecord[], dailyEquityBase: number): number[] {
  const byDay = new Map<number, number>();
  for (const trade of trades) {
    if (trade.exitDate === undefined) continue;
    const dayKey = Math.floor(trade.exitDate.getTime() / MS_PER_DAY);
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + trade.pnl);
  }

  return Array.from(byDay.values()).map((dayPnl) => (dayPnl / dailyEquityBase) * 100);
}

/**
 * Return a zeroed metrics object for the empty-trades case.
 */
function createEmptyMetrics(): BacktestMetrics {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    grossProfit: 0,
    grossLoss: 0,
    netProfit: 0,
    netProfitPercent: 0,
    profitFactor: 0,
    expectancy: 0,
    averageWin: 0,
    averageLoss: 0,
    riskRewardRatio: 0,
    maxDrawdown: 0,
    maxDrawdownDuration: 0,
    currentDrawdown: 0,
    largestWin: 0,
    largestLoss: 0,
    averageHoldingPeriod: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    sharpeRatio: undefined,
    sortinoRatio: undefined,
    calmarRatio: undefined,
    recoveryFactor: undefined,
  };
}
