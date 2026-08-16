/**
 * Indicators Module - Main Export
 * Pure TypeScript implementations of technical indicators
 */
export type { IndicatorResult } from '@/types/indicators';

import type { Candle } from '@/types/market-data';
import type {
  EMAValue,
  RSIValue,
  MACDValue,
  ATRValue,
  ADXValue,
  VolumeValue,
  PreviousLevelsValue,
} from '@/types/indicators';
import type { MarketRegime } from '@/types/setup';

import { calculateEMA as _calculateEMA } from './ema';
import { calculateRSI as _calculateRSI } from './rsi';
import { calculateMACD as _calculateMACD } from './macd';
import { calculateATR as _calculateATR } from './atr';
import { calculateADX as _calculateADX } from './adx';
import { calculateVolume as _calculateVolume } from './volume';

/**
 * Calculate EMA values (20, 50, 100, 200)
 */
export function calculateEMA(candles: Candle[]): EMAValue {
  return _calculateEMA(candles);
}

/**
 * Calculate RSI (14)
 */
export function calculateRSI(candles: Candle[]): RSIValue {
  return _calculateRSI(candles);
}

/**
 * Calculate MACD (12, 26, 9)
 */
export function calculateMACD(candles: Candle[]): MACDValue {
  return _calculateMACD(candles);
}

/**
 * Calculate ATR (14)
 */
export function calculateATR(candles: Candle[]): ATRValue {
  return _calculateATR(candles);
}

/**
 * Calculate ADX (14)
 */
export function calculateADX(candles: Candle[]): ADXValue {
  return _calculateADX(candles);
}

/**
 * Calculate Volume SMA and relative volume
 */
export function calculateVolume(candles: Candle[]): VolumeValue {
  return _calculateVolume(candles);
}

/**
 * Calculate previous levels (high, low, close, open, volume)
 */
export function calculatePreviousLevels(candles: Candle[]): PreviousLevelsValue {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  return {
    prevHigh: prev?.high ?? last?.high ?? 0,
    prevLow: prev?.low ?? last?.low ?? 0,
    prevClose: prev?.close ?? last?.close ?? 0,
    prevOpen: prev?.open ?? last?.open ?? 0,
    prevVolume: prev?.volume ?? last?.volume ?? 0,
  };
}

/**
 * Get market regime from candles
 */
export function getMarketRegime(candles: Candle[]): MarketRegime {
  // Delegated to market-regime.ts which imports from this module
  return getMarketRegimeImpl(candles);
}

// Re-export for convenience (series functions for charting)
export { calculateEMASeriesForAll } from './ema';
export { calculateRSISeriesFull } from './rsi';
export { calculateMACDSeries } from './macd';
export { calculateATRSeriesFull } from './atr';
export { calculateADXSeriesFull } from './adx';
export { calculateVolumeSeries } from './volume';

// Import at bottom to avoid circular reference issues
import { getMarketRegime as getMarketRegimeImpl } from './market-regime';
