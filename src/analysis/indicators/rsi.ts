/**
 * Relative Strength Index (RSI) - 14 period
 * Pure TypeScript implementation
 */
import type { Candle } from '@/types/market-data';
import type { RSIValue, RSISeries } from '@/types/indicators';

const RSI_PERIOD = 14;

/**
 * Calculate RSI series using Wilder's smoothing method.
 */
function calculateRSISeries(values: number[]): number[] {
  if (values.length < RSI_PERIOD + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const curr = values[i] ?? 0;
    const prev = values[i - 1] ?? 0;
    changes.push(curr - prev);
  }

  const gains: number[] = [];
  const losses: number[] = [];
  for (const change of changes) {
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Seed with simple average (Wilder's method uses SMMA which is similar to EMA with 1/period)
  let avgGain = gains.slice(0, RSI_PERIOD).reduce((a, b) => a + b, 0) / RSI_PERIOD;
  let avgLoss = losses.slice(0, RSI_PERIOD).reduce((a, b) => a + b, 0) / RSI_PERIOD;

  const rsi: number[] = new Array(values.length).fill(NaN);
  rsi[RSI_PERIOD] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  // Wilder's smoothing (equivalent to EMA with alpha = 1/period)
  const alpha = 1 / RSI_PERIOD;
  for (let i = RSI_PERIOD + 1; i < values.length; i++) {
    const gain = gains[i - 1] ?? 0;
    const loss = losses[i - 1] ?? 0;
    avgGain = avgGain * (1 - alpha) + gain * alpha;
    avgLoss = avgLoss * (1 - alpha) + loss * alpha;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

/**
 * Calculate RSI (14) for the latest candle.
 */
export function calculateRSI(candles: Candle[]): RSIValue {
  if (candles.length < RSI_PERIOD + 1) {
    return { rsi: 50, signal: 'NEUTRAL' };
  }

  const closes = candles.map((c) => c.close);
  const rsiSeries = calculateRSISeries(closes);
  const rsi = rsiSeries[rsiSeries.length - 1] ?? 50;

  let signal: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' = 'NEUTRAL';
  if (rsi <= 30) signal = 'OVERSOLD';
  else if (rsi >= 70) signal = 'OVERBOUGHT';

  return { rsi: Number.isNaN(rsi) ? 50 : rsi, signal };
}

/**
 * Calculate full RSI series (for charting).
 */
export function calculateRSISeriesFull(candles: Candle[]): RSISeries {
  if (candles.length < RSI_PERIOD + 1) {
    return { values: [], timestamps: [] };
  }

  const closes = candles.map((c) => c.close);
  const values = calculateRSISeries(closes);
  const timestamps = candles.map((c) => c.timestamp);

  return { values, timestamps };
}
