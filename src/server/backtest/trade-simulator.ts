/**
 * Trade Simulator
 * Tracks a single trade from entry to exit against a series of candles.
 *
 * Handles target hits, stop-loss hits, time-based exits, and computes
 * P&L, R-multiple, MFE (max favorable excursion) and MAE (max adverse
 * excursion) in R units.
 */
import type { Candle } from '@/types/market-data';
import type { TradeRecord } from '@/types/backtest';

export interface TradeSimulationInput {
  // Identification
  tradeId: string;
  symbol: string;
  // Entry
  entryDate: Date;
  entryPrice: number;
  entrySignal: string;
  // Position
  direction: 'LONG' | 'SHORT';
  quantity: number;
  // Risk
  stopLoss: number;
  targets: number[];
  // Execution costs
  commissionPerTrade: number;
  slippagePercent: number;
  // Time limit (max holding period in days)
  maxHoldDays: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Simulate a single trade by walking forward through candles beginning at the
 * entry candle. Returns a fully populated {@link TradeRecord}.
 *
 * The entry candle is taken as the first candle whose timestamp is >= the
 * provided entryDate. From there the simulator checks each subsequent candle
 * for stop-loss, target, and time-based exits.
 */
export function simulateTrade(input: TradeSimulationInput, candles: Candle[]): TradeRecord {
  const {
    tradeId,
    symbol,
    entryDate,
    entryPrice,
    entrySignal,
    direction,
    quantity,
    stopLoss,
    targets,
    commissionPerTrade,
    slippagePercent,
    maxHoldDays,
  } = input;

  // Find the entry candle index.
  let entryIdx = candles.findIndex((c) => c.timestamp >= entryDate.getTime());
  if (entryIdx === -1) {
    // No candle at/after entry — cannot simulate.
    entryIdx = candles.length - 1;
  }

  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const isLong = direction === 'LONG';

  // Apply slippage to the entry fill price.
  const filledEntryPrice = applySlippage(entryPrice, slippagePercent, isLong);

  let exitPrice = filledEntryPrice;
  let exitSignal = 'TIME_EXIT';
  let exitIdx = candles.length - 1;

  // Excursion tracking in price terms (initialized at entry).
  let bestPrice = filledEntryPrice;
  let worstPrice = filledEntryPrice;

  const remainingTargets = [...targets];

  for (let i = entryIdx; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;

    // Update excursions (favorable = toward profit, adverse = toward loss).
    bestPrice = isLong ? Math.max(bestPrice, candle.high) : Math.min(bestPrice, candle.low);
    worstPrice = isLong ? Math.min(worstPrice, candle.low) : Math.max(worstPrice, candle.high);

    // 1. Check stop-loss first (intrabar: assume SL hit before targets on the
    //    same bar when the wick breaches both — conservative).
    const slHit = isLong ? candle.low <= stopLoss : candle.high >= stopLoss;
    if (slHit) {
      exitPrice = applySlippage(stopLoss, slippagePercent, isLong);
      exitSignal = 'STOP_LOSS';
      exitIdx = i;
      break;
    }

    // 2. Check targets (still within bar). For partial exits we continue
    //    scanning but track which targets are hit.
    let allTargetsHit = true;
    for (let t = 0; t < remainingTargets.length; t++) {
      const target = remainingTargets[t];
      if (target === undefined) continue;
      const targetHit = isLong ? candle.high >= target : candle.low <= target;
      if (targetHit) {
        remainingTargets[t] = undefined as unknown as number;
      } else {
        allTargetsHit = false;
      }
    }

    if (allTargetsHit && remainingTargets.length > 0) {
      // Exit at the final (furthest) target.
      const lastTarget = targets[targets.length - 1] as number;
      exitPrice = applySlippage(lastTarget, slippagePercent, isLong);
      exitSignal = `TARGET_${targets.length}`;
      exitIdx = i;
      break;
    }

    // 3. Time-based exit.
    const entryCandle = candles[entryIdx];
    const holdingDays =
      entryCandle !== undefined ? (candle.timestamp - entryCandle.timestamp) / MS_PER_DAY : 0;
    if (holdingDays >= maxHoldDays) {
      exitPrice = applySlippage(candle.close, slippagePercent, isLong);
      exitSignal = 'TIME_EXIT';
      exitIdx = i;
      break;
    }
  }

  const finalExitCandle = candles[exitIdx];
  const exitCandle: Candle = finalExitCandle ??
    candles[candles.length - 1] ?? {
      timestamp: entryDate.getTime(),
      open: filledEntryPrice,
      high: filledEntryPrice,
      low: filledEntryPrice,
      close: filledEntryPrice,
      volume: 0,
    };
  const exitDate = new Date(exitCandle.timestamp);

  // P&L per share (filled prices).
  const priceDiff = isLong ? exitPrice - filledEntryPrice : filledEntryPrice - exitPrice;
  const rawPnl = priceDiff * quantity;

  // Commission: charged on entry and exit.
  const commissionPaid = commissionPerTrade * 2;
  const slippageCost = computeSlippageCost(
    filledEntryPrice,
    exitPrice,
    quantity,
    slippagePercent,
    isLong
  );

  const pnl = rawPnl - commissionPaid - slippageCost;

  // R-multiple (relative to initial risk per share).
  const rMultiple = riskPerShare > 0 ? pnl / (riskPerShare * quantity) : 0;

  // Excursions in R.
  let maxFavorableExcursion = 0;
  let maxAdverseExcursion = 0;
  if (riskPerShare > 0) {
    const favorablePriceMove = isLong ? bestPrice - filledEntryPrice : filledEntryPrice - bestPrice;
    const adversePriceMove = isLong ? filledEntryPrice - worstPrice : worstPrice - filledEntryPrice;
    maxFavorableExcursion = favorablePriceMove / riskPerShare;
    maxAdverseExcursion = -adversePriceMove / riskPerShare; // negative R
  }

  const entryCapital = filledEntryPrice * quantity;
  const pnlPercent = entryCapital > 0 ? (pnl / entryCapital) * 100 : 0;

  const entryCandleForExit = candles[entryIdx];
  const holdingPeriodDays =
    entryCandleForExit !== undefined && exitCandle.timestamp >= entryCandleForExit.timestamp
      ? (exitCandle.timestamp - entryCandleForExit.timestamp) / MS_PER_DAY
      : 0;

  return {
    tradeId,
    symbol,
    entryDate: new Date(entryCandleForExit ? entryCandleForExit.timestamp : Date.now()),
    entryPrice: filledEntryPrice,
    entrySignal,
    exitDate,
    exitPrice,
    exitSignal,
    direction,
    quantity,
    stopLoss,
    targets,
    pnl: round2(pnl),
    pnlPercent: round2(pnlPercent),
    rMultiple: round2(rMultiple),
    maxFavorableExcursion: round2(maxFavorableExcursion),
    maxAdverseExcursion: round2(maxAdverseExcursion),
    holdingPeriodDays: round2(holdingPeriodDays),
    commissionPaid: round2(commissionPaid),
    slippageCost: round2(slippageCost),
  };
}

/**
 * Apply slippage to a price. Buys (long entry / short exit) pay up; sells
 * (long exit / short entry) receive less.
 */
function applySlippage(price: number, slippagePercent: number, isBuy: boolean): number {
  const slip = price * (slippagePercent / 100);
  return isBuy ? price + slip : price - slip;
}

/**
 * Compute total slippage cost across entry and exit fills, in currency.
 */
function computeSlippageCost(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  slippagePercent: number,
  isLong: boolean
): number {
  // Slippage is paid on the value traded at entry and exit.
  const entrySlip = entryPrice * (slippagePercent / 100) * quantity;
  const exitSlip = exitPrice * (slippagePercent / 100) * quantity;
  // Direction does not change the cost magnitude; both are paid.
  void isLong;
  return entrySlip + exitSlip;
}

/**
 * Round to 2 decimal places.
 */
function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
