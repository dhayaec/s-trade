/**
 * MACD (Moving Average Convergence Divergence)
 * Standard parameters: 12, 26, 9
 * Pure TypeScript implementation
 */
import type { Candle } from '@/types/market-data';
import type { MACDValue, MACDSeries } from '@/types/indicators';
import { calculateEMASeries as _calculateEMASeries } from './ema';

const calculateEMASeries = _calculateEMASeries;

const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;

/**
 * Calculate MACD values for the latest candle.
 */
export function calculateMACD(candles: Candle[]): MACDValue {
  if (candles.length < MACD_SLOW) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL' };
  }

  const closes = candles.map((c) => c.close);

  // Calculate fast and slow EMA series
  const fastEMA = calculateEMASeries(closes, MACD_FAST);
  const slowEMA = calculateEMASeries(closes, MACD_SLOW);

  if (!fastEMA || !slowEMA) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL' };
  }

  // MACD line = fast EMA - slow EMA
  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = MACD_SLOW - 1; i < closes.length; i++) {
    const fast = fastEMA[i] ?? 0;
    const slow = slowEMA[i] ?? 0;
    if (!Number.isNaN(fast) && !Number.isNaN(slow)) {
      macdLine[i] = fast - slow;
    }
  }

  // Signal line = EMA of MACD line with period 9
  // We need to calculate EMA of the MACD line
  const validMacd = macdLine.filter((v) => !Number.isNaN(v));
  if (validMacd.length < MACD_SIGNAL) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL' };
  }

  // Calculate signal EMA on MACD values
  const signalEMA = calculateEMASeries(
    macdLine.map((v) => (Number.isNaN(v) ? 0 : v)),
    MACD_SIGNAL
  );

  if (!signalEMA) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL' };
  }

  const lastIndex = closes.length - 1;
  const macd = macdLine[lastIndex] ?? 0;
  const signal = signalEMA[lastIndex] ?? 0;
  const histogram = macd - signal;

  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (macd > signal) trend = 'BULLISH';
  else if (macd < signal) trend = 'BEARISH';

  return { macd, signal, histogram, trend };
}

/**
 * Calculate full MACD series (for charting).
 */
export function calculateMACDSeries(candles: Candle[]): MACDSeries {
  if (candles.length < MACD_SLOW) {
    return { macd: [], signal: [], histogram: [], timestamps: [] };
  }

  const closes = candles.map((c) => c.close);
  const timestamps = candles.map((c) => c.timestamp);

  const fastEMA = calculateEMASeries(closes, MACD_FAST);
  const slowEMA = calculateEMASeries(closes, MACD_SLOW);

  if (!fastEMA || !slowEMA) {
    return { macd: [], signal: [], histogram: [], timestamps: [] };
  }

  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = MACD_SLOW - 1; i < closes.length; i++) {
    const fast = fastEMA[i] ?? 0;
    const slow = slowEMA[i] ?? 0;
    if (!Number.isNaN(fast) && !Number.isNaN(slow)) {
      macdLine[i] = fast - slow;
    }
  }

  const signalEMA = calculateEMASeries(
    macdLine.map((v) => (Number.isNaN(v) ? 0 : v)),
    MACD_SIGNAL
  );

  if (!signalEMA) {
    return { macd: [], signal: [], histogram: [], timestamps: [] };
  }

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push((macdLine[i] ?? 0) - (signalEMA[i] ?? 0));
  }

  return { macd: macdLine, signal: signalEMA, histogram, timestamps };
}
