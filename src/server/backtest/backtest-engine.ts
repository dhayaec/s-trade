/**
 * Backtesting Engine
 * Simulates a trading strategy over historical OHLCV data and produces
 * trade records, performance metrics, and an equity curve.
 *
 * Design notes:
 * - The same {@link AnalysisEngine} used for live analysis drives setup
 *   detection here, keeping live and backtest logic consistent.
 * - The engine is UI/API agnostic: it talks to a {@link BacktestDataProvider}
 *   for candles and to a {@link SetupGenerator} for setup detection. Both are
 *   injectable so the engine can be unit tested without a real data source.
 */
import type { Candle } from '@/types/market-data';
import type {
  BacktestConfig,
  BacktestResult,
  BacktestMetrics,
  TradeRecord,
  EquityPoint,
  DailyReturn,
  MonthlyReturn,
  SymbolPerformance,
} from '@/types/backtest';
import type { StrategyType, StrategyConfig } from '@/types/strategy';
import type { TradingSetup } from '@/types/setup';
import { simulateTrade } from './trade-simulator';
import {
  calculateMetrics,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateCalmarRatio,
  buildDailyReturns,
} from './metrics';
import { AnalysisEngine } from '@/analysis/engine/analysis-engine';
import type { EngineInput, AnalysisEngineConfig } from '@/analysis/engine/interfaces';
import type { ScoringEngine } from '@/analysis/scoring';
import { createScoringEngine } from '@/analysis/scoring';
import { BreakoutStrategy } from '@/analysis/strategies/breakout';
import { PullbackStrategy } from '@/analysis/strategies/pullback';
import { SupportBounceStrategy } from '@/analysis/strategies/support-bounce';
import { ReversalStrategy } from '@/analysis/strategies/reversal';

const MS_PER_DAY = 86_400_000;

/**
 * Supplies historical candles for a symbol/timeframe/date range.
 */
export interface BacktestDataProvider {
  getCandles(symbol: string, timeframe: string, from: Date, to: Date): Promise<Candle[]>;
}

/**
 * A detected setup plus its computed quality score.
 */
export interface SetupCandidate {
  setup: TradingSetup;
  score: number;
  strategyType: StrategyType;
}

/**
 * Detects a setup at a given point in time across the three timeframes.
 * Injectable for testing.
 */
export interface SetupGenerator {
  generate(params: {
    symbol: string;
    higherCandles: Candle[];
    setupCandles: Candle[];
    entryCandles: Candle[];
    timestamp: number;
  }): Promise<SetupCandidate | null>;
}

export interface BacktestEngineDeps {
  dataProvider?: BacktestDataProvider;
  setupGenerator?: SetupGenerator;
}

/**
 * Main backtest entry point.
 *
 * @param config - Backtest configuration
 * @param deps - Optional injected data provider / setup generator
 */
export async function runBacktest(
  config: BacktestConfig,
  deps: BacktestEngineDeps = {}
): Promise<BacktestResult> {
  const setupGenerator =
    deps.setupGenerator ?? createDefaultSetupGenerator(config.strategyType, config.strategyConfig);
  const dataProvider = deps.dataProvider;

  const allTrades: TradeRecord[] = [];
  let currentEquity = config.initialCapital;

  for (const symbol of config.symbols) {
    const symbolTrades = await runSymbolBacktest(symbol, config, setupGenerator, dataProvider);

    // Update running equity as trades close (in exit-date order).
    const sorted = [...symbolTrades].sort(
      (a, b) => (a.exitDate?.getTime() ?? 0) - (b.exitDate?.getTime() ?? 0)
    );
    for (const trade of sorted) {
      currentEquity += trade.pnl;
    }

    allTrades.push(...symbolTrades);
  }

  const finalCapital = currentEquity;

  const metrics = calculateMetrics(allTrades, config.initialCapital);

  // Sharpe / Sortino / Calmar using daily returns.
  const dailyReturnsPct = buildDailyReturns(allTrades, config.initialCapital);
  const dailyReturnsFraction = dailyReturnsPct.map((r) => r / 100);
  const sharpe = calculateSharpeRatio(dailyReturnsFraction);
  const sortino = calculateSortinoRatio(dailyReturnsFraction);
  const totalReturnFraction =
    config.initialCapital > 0 ? finalCapital / config.initialCapital - 1 : 0;
  const calmar = calculateCalmarRatio(totalReturnFraction, metrics.maxDrawdown / 100);

  const metricsWithRatios: BacktestMetrics = {
    ...metrics,
    sharpeRatio: sharpe ?? undefined,
    sortinoRatio: sortino ?? undefined,
    calmarRatio: calmar ?? undefined,
  };

  const equityCurve = buildEquityCurve(allTrades, config.initialCapital, finalCapital);
  const dailyReturns = buildDailyReturnSeries(allTrades, config.initialCapital);
  const monthlyReturns = buildMonthlyReturns(allTrades, config.initialCapital);
  const symbolPerformance = buildSymbolPerformance(allTrades, config.initialCapital);

  return {
    config,
    trades: allTrades,
    metrics: metricsWithRatios,
    equityCurve,
    dailyReturns,
    monthlyReturns,
    symbolPerformance,
    startDate: config.startDate,
    endDate: config.endDate,
    initialCapital: config.initialCapital,
    finalCapital,
  };
}

/**
 * Backtest a single symbol, returning all closed trade records.
 */
async function runSymbolBacktest(
  symbol: string,
  config: BacktestConfig,
  setupGenerator: SetupGenerator,
  dataProvider: BacktestDataProvider | undefined
): Promise<TradeRecord[]> {
  // Load candle data for the three timeframes.
  const higherCandles = await loadCandles(dataProvider, symbol, config.higherTimeframe, config);
  const setupCandles = await loadCandles(dataProvider, symbol, config.setupTimeframe, config);
  const entryCandles = await loadCandles(dataProvider, symbol, config.entryTimeframe, config);

  if (entryCandles.length < 2) {
    return [];
  }

  const trades: TradeRecord[] = [];
  const startDateMs = config.startDate.getTime();
  const endDateMs = config.endDate.getTime();

  let i = 0;
  const maxHoldDays = Math.max(1, Math.round(30)); // default time exit horizon

  while (i < entryCandles.length) {
    const entryCandle = entryCandles[i];
    if (!entryCandle) {
      i += 1;
      continue;
    }

    // Skip bars outside the configured date range.
    if (entryCandle.timestamp < startDateMs || entryCandle.timestamp > endDateMs) {
      i += 1;
      continue;
    }

    // Limit open positions per symbol to maxPositions.
    if (countOpenPositions(trades) >= config.maxPositions) {
      i += 1;
      continue;
    }

    // Build truncated context up to and including this bar.
    const truncatedHigher = higherCandles.filter((c) => c.timestamp <= entryCandle.timestamp);
    const truncatedSetup = setupCandles.filter((c) => c.timestamp <= entryCandle.timestamp);
    const truncatedEntry = entryCandles.filter((c) => c.timestamp <= entryCandle.timestamp);

    if (truncatedHigher.length < 2 || truncatedSetup.length < 2 || truncatedEntry.length < 2) {
      i += 1;
      continue;
    }

    const candidate = await setupGenerator.generate({
      symbol,
      higherCandles: truncatedHigher,
      setupCandles: truncatedSetup,
      entryCandles: truncatedEntry,
      timestamp: entryCandle.timestamp,
    });

    if (!candidate || !passesFilters(candidate, config)) {
      i += 1;
      continue;
    }

    const setup = candidate.setup;
    const direction = setup.direction;

    // Position sizing based on risk percent of current equity.
    const quantity = computePositionSize(
      config.initialCapital,
      config.riskPercent,
      setup.entry,
      setup.stopLoss
    );
    if (quantity <= 0) {
      i += 1;
      continue;
    }

    const trade = simulateTrade(
      {
        tradeId: `${symbol}-${entryCandle.timestamp}-${trades.length}`,
        symbol,
        entryDate: new Date(entryCandle.timestamp),
        entryPrice: setup.entry,
        entrySignal: `${setup.setupType}_ENTRY`,
        direction,
        quantity,
        stopLoss: setup.stopLoss,
        targets: setup.targets,
        commissionPerTrade: config.commissionPerTrade,
        slippagePercent: config.slippagePercent,
        maxHoldDays,
      },
      entryCandles
    );

    trades.push(trade);

    // Advance to the bar after exit to avoid re-entering immediately.
    const exitIdx = entryCandles.findIndex(
      (c) => c.timestamp >= (trade.exitDate?.getTime() ?? entryCandle.timestamp)
    );
    i = exitIdx === -1 ? entryCandles.length : exitIdx + 1;
  }

  return trades;
}

/**
 * Compute quantity from risk percent of capital.
 */
function computePositionSize(
  capital: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): number {
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  if (riskPerShare <= 0) return 0;
  const capitalAtRisk = capital * (riskPercent / 100);
  const quantity = Math.floor(capitalAtRisk / riskPerShare);
  return Math.max(0, quantity);
}

/**
 * Apply backtest-level filters (minScore, minRiskReward) on top of the
 * strategy config.
 */
function passesFilters(candidate: SetupCandidate, config: BacktestConfig): boolean {
  if (config.minScore !== undefined && candidate.score < config.minScore) {
    return false;
  }
  if (config.minRiskReward !== undefined && candidate.setup.riskReward < config.minRiskReward) {
    return false;
  }
  return true;
}

/**
 * Count trades that have not yet exited.
 */
function countOpenPositions(trades: TradeRecord[]): number {
  return trades.filter((t) => t.exitDate === undefined).length;
}

/**
 * Load candles via the data provider (or empty array if none provided).
 */
async function loadCandles(
  provider: BacktestDataProvider | undefined,
  symbol: string,
  timeframe: string,
  config: BacktestConfig
): Promise<Candle[]> {
  if (!provider) return [];
  return provider.getCandles(symbol, timeframe, config.startDate, config.endDate);
}

/**
 * Build an equity curve from start capital, trade P&L, and final capital.
 */
function buildEquityCurve(
  trades: TradeRecord[],
  initialCapital: number,
  finalCapital: number
): EquityPoint[] {
  const points: EquityPoint[] = [];
  let equity = initialCapital;
  let peak = initialCapital;

  const firstTrade = trades[0];
  points.push({
    date: firstTrade && firstTrade.entryDate ? firstTrade.entryDate : new Date(),
    equity: round2(equity),
    drawdown: 0,
    drawdownPercent: 0,
  });

  const sorted = [...trades].sort(
    (a, b) => (a.exitDate?.getTime() ?? 0) - (b.exitDate?.getTime() ?? 0)
  );

  for (const trade of sorted) {
    equity += trade.pnl;
    if (equity > peak) peak = equity;
    const drawdown = peak - equity;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
    points.push({
      date: trade.exitDate ?? trade.entryDate,
      equity: round2(equity),
      drawdown: round2(drawdown),
      drawdownPercent: round2(drawdownPercent),
    });
  }

  // Ensure the final capital is reflected.
  if (sorted.length > 0) {
    const last = points[points.length - 1];
    const lastEquity = last ? last.equity : initialCapital;
    if (round2(lastEquity) !== round2(finalCapital)) {
      equity = finalCapital;
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      const lastTrade = sorted[sorted.length - 1];
      if (lastTrade) {
        points.push({
          date: lastTrade.exitDate ?? lastTrade.entryDate,
          equity: round2(equity),
          drawdown: round2(drawdown),
          drawdownPercent: round2(drawdownPercent),
        });
      }
    }
  }

  return points;
}

/**
 * Build the daily return series keyed by exit date.
 */
function buildDailyReturnSeries(trades: TradeRecord[], initialCapital: number): DailyReturn[] {
  const byDay = new Map<number, { pnl: number; equityAfter: number }>();
  let runningEquity = initialCapital;

  const sorted = [...trades].sort(
    (a, b) => (a.exitDate?.getTime() ?? 0) - (b.exitDate?.getTime() ?? 0)
  );

  for (const trade of sorted) {
    if (trade.exitDate === undefined) continue;
    runningEquity += trade.pnl;
    const dayKey = Math.floor(trade.exitDate.getTime() / MS_PER_DAY);
    const prev = byDay.get(dayKey);
    if (prev) {
      prev.pnl += trade.pnl;
      prev.equityAfter = runningEquity;
    } else {
      byDay.set(dayKey, { pnl: trade.pnl, equityAfter: runningEquity });
    }
  }

  return Array.from(byDay.entries())
    .map(([dayKey, val]) => ({
      date: new Date(dayKey * MS_PER_DAY),
      return: initialCapital > 0 ? round2((val.pnl / initialCapital) * 100) : 0,
      equity: round2(val.equityAfter),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Build monthly aggregated returns.
 */
function buildMonthlyReturns(trades: TradeRecord[], initialCapital: number): MonthlyReturn[] {
  const byMonth = new Map<string, { pnl: number; trades: TradeRecord[] }>();

  for (const trade of trades) {
    if (trade.exitDate === undefined) continue;
    const d = trade.exitDate;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    const bucket = byMonth.get(key);
    if (bucket) {
      bucket.pnl += trade.pnl;
      bucket.trades.push(trade);
    } else {
      byMonth.set(key, { pnl: trade.pnl, trades: [trade] });
    }
  }

  return Array.from(byMonth.entries())
    .map(([_key, val]) => {
      const winning = val.trades.filter((t) => t.pnl > 0).length;
      const total = val.trades.length;
      const sample = val.trades[0];
      return {
        year: sample && sample.exitDate ? sample.exitDate.getUTCFullYear() : 0,
        month: sample && sample.exitDate ? sample.exitDate.getUTCMonth() + 1 : 0,
        return: initialCapital > 0 ? round2((val.pnl / initialCapital) * 100) : 0,
        trades: total,
        winRate: total > 0 ? round2((winning / total) * 100) : 0,
      };
    })
    .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
}

/**
 * Build per-symbol performance summary.
 */
function buildSymbolPerformance(
  trades: TradeRecord[],
  initialCapital: number
): SymbolPerformance[] {
  const bySymbol = new Map<string, TradeRecord[]>();
  for (const trade of trades) {
    const list = bySymbol.get(trade.symbol);
    if (list) list.push(trade);
    else bySymbol.set(trade.symbol, [trade]);
  }

  const result: SymbolPerformance[] = [];
  for (const [symbol, list] of bySymbol.entries()) {
    const winning = list.filter((t) => t.pnl > 0).length;
    const netProfit = list.reduce((sum, t) => sum + t.pnl, 0);
    const avgR = list.length > 0 ? list.reduce((s, t) => s + t.rMultiple, 0) / list.length : 0;

    // Symbol-level max drawdown via cumulative equity.
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDD = 0;
    const sorted = [...list].sort(
      (a, b) => (a.exitDate?.getTime() ?? 0) - (b.exitDate?.getTime() ?? 0)
    );
    for (const t of sorted) {
      equity += t.pnl;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }

    result.push({
      symbol,
      trades: list.length,
      winRate: list.length > 0 ? round2((winning / list.length) * 100) : 0,
      netProfit: round2(netProfit),
      netProfitPercent: initialCapital > 0 ? round2((netProfit / initialCapital) * 100) : 0,
      avgR: round2(avgR),
      maxDrawdown: round2(maxDD),
    });
  }

  return result;
}

/**
 * Default {@link SetupGenerator} backed by the real {@link AnalysisEngine}.
 */
export function createDefaultSetupGenerator(
  strategyType: StrategyType,
  strategyConfig: StrategyConfig
): SetupGenerator {
  const engine = buildAnalysisEngine(strategyType, strategyConfig);
  const scorer: ScoringEngine = createScoringEngine();

  return {
    generate: async ({
      symbol,
      higherCandles,
      setupCandles,
      entryCandles,
      timestamp: _timestamp,
    }) => {
      const input: EngineInput = {
        symbol,
        candles: {
          higher: higherCandles,
          setup: setupCandles,
          entry: entryCandles,
        },
        timeframes: {
          higher: strategyConfig.higherTimeframe as EngineInput['timeframes']['higher'],
          setup: strategyConfig.setupTimeframe as EngineInput['timeframes']['setup'],
          entry: strategyConfig.entryTimeframe as EngineInput['timeframes']['entry'],
        },
        config: strategyConfig,
      };

      const output = await engine.analyze(input);
      const bestSetup = output.bestSetup;
      if (!bestSetup || !bestSetup.setup) return null;

      const score = scorer.score(output.context, bestSetup);
      return {
        setup: bestSetup.setup,
        score,
        strategyType: output.activeStrategy ?? strategyType,
      };
    },
  };
}

/**
 * Build an {@link AnalysisEngine} with the requested strategy registered.
 */
function buildAnalysisEngine(
  strategyType: StrategyType,
  strategyConfig: StrategyConfig
): AnalysisEngine {
  const engineConfig: AnalysisEngineConfig = {
    strategies: [strategyType],
    indicatorCalculators: new Map(),
    priceActionDetectors: new Map(),
    patternDetectors: new Map(),
    riskCalculator: {
      calculate: () => [],
    },
    scorer: { score: () => 0 },
  };

  const engine = new AnalysisEngine(engineConfig);
  engine.registerStrategy(createStrategy(strategyType, strategyConfig));
  return engine;
}

/**
 * Instantiate the strategy class matching the requested type.
 */
function createStrategy(strategyType: StrategyType, strategyConfig: StrategyConfig) {
  switch (strategyType) {
    case 'BREAKOUT':
      return new BreakoutStrategy(strategyConfig);
    case 'PULLBACK':
      return new PullbackStrategy(strategyConfig);
    case 'SUPPORT_BOUNCE':
      return new SupportBounceStrategy(strategyConfig);
    case 'REVERSAL':
      return new ReversalStrategy(strategyConfig);
    default:
      throw new Error(`Unsupported strategy type: ${strategyType}`);
  }
}

/**
 * Round to 2 decimal places.
 */
function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
