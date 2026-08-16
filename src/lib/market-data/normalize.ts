/**
 * Market Data Normalization
 * Convert provider-specific data to domain types
 */

import type { Candle } from '@/types';

export interface RawCandle {
  timestamp: number | string | Date;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
}

/**
 * Normalize raw candle data to domain Candle type
 * Handles various timestamp formats and string numbers
 */
export function normalizeCandle(raw: RawCandle): Candle {
  const timestamp = normalizeTimestamp(raw.timestamp);
  return {
    timestamp,
    open: Number(raw.open),
    high: Number(raw.high),
    low: Number(raw.low),
    close: Number(raw.close),
    volume: Number(raw.volume),
  };
}

/**
 * Normalize array of raw candles
 */
export function normalizeCandles(rawCandles: RawCandle[]): Candle[] {
  return rawCandles
    .map(normalizeCandle)
    .filter(
      (c) =>
        isFinite(c.open) &&
        isFinite(c.high) &&
        isFinite(c.low) &&
        isFinite(c.close) &&
        isFinite(c.volume)
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Normalize timestamp to Unix milliseconds
 */
function normalizeTimestamp(ts: number | string | Date): number {
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') {
    // Assume seconds if < 1e12, milliseconds otherwise
    return ts < 1e12 ? ts * 1000 : ts;
  }
  // String - try parsing as ISO date first, then as number
  const asDate = new Date(ts);
  if (!isNaN(asDate.getTime())) return asDate.getTime();
  const asNumber = Number(ts);
  return asNumber < 1e12 ? asNumber * 1000 : asNumber;
}

/**
 * Validate candle data integrity
 */
export function validateCandle(candle: Candle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isFinite(candle.timestamp) || candle.timestamp <= 0) {
    errors.push('Invalid timestamp');
  }
  if (!isFinite(candle.open) || candle.open <= 0) {
    errors.push('Invalid open price');
  }
  if (!isFinite(candle.high) || candle.high <= 0) {
    errors.push('Invalid high price');
  }
  if (!isFinite(candle.low) || candle.low <= 0) {
    errors.push('Invalid low price');
  }
  if (!isFinite(candle.close) || candle.close <= 0) {
    errors.push('Invalid close price');
  }
  if (!isFinite(candle.volume) || candle.volume < 0) {
    errors.push('Invalid volume');
  }
  if (candle.high < Math.max(candle.open, candle.close)) {
    errors.push('High less than open/close');
  }
  if (candle.low > Math.min(candle.open, candle.close)) {
    errors.push('Low greater than open/close');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate array of candles
 */
export function validateCandles(candles: Candle[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (candles.length === 0) {
    errors.push('No candles provided');
    return { valid: false, errors };
  }

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    if (!candle) continue;
    const validation = validateCandle(candle);
    if (!validation.valid) {
      errors.push(`Candle ${i}: ${validation.errors.join(', ')}`);
    }
  }

  // Check for duplicate timestamps
  const timestamps = new Set<number>();
  for (const c of candles) {
    if (!c) continue;
    if (timestamps.has(c.timestamp)) {
      errors.push(`Duplicate timestamp: ${c.timestamp}`);
    }
    timestamps.add(c.timestamp);
  }

  // Check chronological order
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    if (!current || !prev) continue;
    if (current.timestamp <= prev.timestamp) {
      errors.push(`Non-chronological order at index ${i}`);
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Fill missing candles in a series (for regular intervals)
 */
export function fillMissingCandles(candles: Candle[], intervalMs: number): Candle[] {
  if (candles.length < 2) return candles;

  const filled: Candle[] = [];
  for (let i = 0; i < candles.length - 1; i++) {
    const current = candles[i];
    const next = candles[i + 1];
    if (!current || !next) continue;
    filled.push(current);
    const expectedNext = current.timestamp + intervalMs;

    // If gap > 1.5 intervals, fill with synthetic candles
    if (next.timestamp > expectedNext * 1.5) {
      let fillTime = expectedNext;
      while (fillTime < next.timestamp - intervalMs * 0.5) {
        filled.push({
          timestamp: fillTime,
          open: current.close,
          high: current.close,
          low: current.close,
          close: current.close,
          volume: 0,
        });
        fillTime += intervalMs;
      }
    }
  }
  // Add the last candle
  const lastCandle = candles[candles.length - 1];
  if (lastCandle) {
    filled.push(lastCandle);
  }
  return filled;
}
