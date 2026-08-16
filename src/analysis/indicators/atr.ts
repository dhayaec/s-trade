/**
 * Average True Range (ATR) - 14 period
 * Pure TypeScript implementation using Wilder's smoothing
 */
import type { Candle } from '@/types/market-data';
import type { ATRValue, ATRSeries } from '@/types/indicators';

const ATR_PERIOD = 14;

/**
 * Calculate True Range for each candle.
 */
function calculateTrueRange(candles: Candle[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i] as Candle;
    if (i === 0) {
      tr.push(c.high - c.low);
      continue;
    }
    const prevClose = (candles[i - 1] as Candle).close;
    const hl = c.high - c.low;
    const hc = Math.abs(c.high - prevClose);
    const lc = Math.abs(c.low - prevClose);
    tr.push(Math.max(hl, hc, lc));
  }
  return tr;
}

/**
 * Calculate ATR series using Wilder's smoothing.
 */
function calculateATRSeries(candles: Candle[]): number[] {
  if (candles.length < ATR_PERIOD + 1) return [];

  const tr = calculateTrueRange(candles);

  // Seed with SMA of first ATR_PERIOD true ranges
  let atr = tr.slice(1, ATR_PERIOD + 1).reduce((a, b) => a + b, 0) / ATR_PERIOD;

  const series: number[] = new Array(candles.length).fill(NaN);
  series[ATR_PERIOD] = atr;

  // Wilder's smoothing (alpha = 1/period)
  const alpha = 1 / ATR_PERIOD;
  for (let i = ATR_PERIOD + 1; i < candles.length; i++) {
    const trValue = tr[i] ?? 0;
    atr = (trValue - atr) * alpha + atr;
    series[i] = atr;
  }

  return series;
}

/**
 * Calculate ATR (14) for the latest candle.
 */
export function calculateATR(candles: Candle[]): ATRValue {
  if (candles.length < ATR_PERIOD + 1) {
    return { atr: 0, atrPercent: 0 };
  }

  const atrSeries = calculateATRSeries(candles);
  const atr = atrSeries[atrSeries.length - 1] ?? 0;
  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const atrPercent = lastClose > 0 ? (atr / lastClose) * 100 : 0;

  return { atr: Number.isNaN(atr) ? 0 : atr, atrPercent };
}

/**
 * Calculate full ATR series (for charting).
 */
export function calculateATRSeriesFull(candles: Candle[]): ATRSeries {
  if (candles.length < ATR_PERIOD + 1) {
    return { values: [], timestamps: [] };
  }

  const values = calculateATRSeries(candles);
  const timestamps = candles.map((c) => c.timestamp);

  return { values, timestamps };
}
