/**
 * Exponential Moving Average (EMA)
 * Pure TypeScript implementation supporting EMA 20, 50, 100, 200
 */
import type { Candle } from '@/types/market-data';
import type { EMAValue, EMASeries } from '@/types/indicators';

const EMA_PERIODS = [20, 50, 100, 200] as const;

/**
 * Calculate EMA value at a specific index using the standard EMA formula.
 * EMA_t = price_t * k + EMA_{t-1} * (1 - k), where k = 2 / (period + 1)
 * Seed with SMA of first `period` values.
 */
export function calculateEMASeries(values: number[], period: number): number[] | null {
  if (values.length < period) return null;

  const k = 2 / (period + 1);
  const series: number[] = new Array(values.length).fill(NaN);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i] as number;
  }
  let ema = sum / period;
  series[period - 1] = ema;

  // Recursive EMA
  for (let i = period; i < values.length; i++) {
    ema = ((values[i] as number) - ema) * k + ema;
    series[i] = ema;
  }

  return series;
}

/**
 * Calculate EMA values (20, 50, 100, 200) for the latest candle.
 */
export function calculateEMA(candles: Candle[]): EMAValue {
  if (candles.length === 0) {
    return { ema20: 0, ema50: 0, ema100: 0, ema200: 0 };
  }

  const closes = candles.map((c) => c.close);

  // Need at least 200 candles for all EMAs
  const minLen = Math.min(...EMA_PERIODS);
  if (closes.length < minLen) {
    return { ema20: 0, ema50: 0, ema100: 0, ema200: 0 };
  }

  const lastIndex = closes.length - 1;
  const result: EMAValue = { ema20: 0, ema50: 0, ema100: 0, ema200: 0 };

  for (const period of EMA_PERIODS) {
    const series = calculateEMASeries(closes, period);
    if (!series) continue;

    const value = series[lastIndex];
    if (value !== undefined && !Number.isNaN(value)) {
      const key = `ema${period}` as keyof EMAValue;
      result[key] = value;
    }
  }

  return result;
}

/**
 * Calculate full EMA series for all periods (for charting).
 */
export function calculateEMASeriesForAll(candles: Candle[]): EMASeries {
  const closes = candles.map((c) => c.close);
  const timestamps = candles.map((c) => c.timestamp);

  const ema20 = calculateEMASeries(closes, 20) ?? [];
  const ema50 = calculateEMASeries(closes, 50) ?? [];
  const ema100 = calculateEMASeries(closes, 100) ?? [];
  const ema200 = calculateEMASeries(closes, 200) ?? [];

  return { ema20, ema50, ema100, ema200, timestamps };
}
