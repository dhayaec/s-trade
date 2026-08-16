/**
 * Market Regime Detection
 * Determines market regime from price action and indicators
 */
import type { Candle } from '@/types/market-data';
import type { MarketRegime } from '@/types/setup';
import { calculateEMA, calculateADX } from './index';

/**
 * Detect market regime from candles
 */
export function getMarketRegime(candles: Candle[]): MarketRegime {
  if (candles.length < 50) return 'RANGE_BOUND';

  const ema = calculateEMA(candles);
  const adx = calculateADX(candles);

  // Use ADX to determine trend strength
  const adxValue = adx.adx;
  const isStrongTrend = adxValue > 25;
  const isVeryStrongTrend = adxValue > 40;

  // Check EMA alignment
  const bullishAlignment = ema.ema20 > ema.ema50 && ema.ema50 > ema.ema200;
  const bearishAlignment = ema.ema20 < ema.ema50 && ema.ema50 < ema.ema200;

  // Check price relative to EMAs
  const latestClose = candles[candles.length - 1]?.close ?? 0;
  const priceAboveEma20 = latestClose > ema.ema20;

  // Determine regime - map to setup.ts MarketRegime values
  if (bullishAlignment && priceAboveEma20 && isStrongTrend) {
    return isVeryStrongTrend ? 'TRENDING_UP' : 'TRENDING_UP';
  }

  if (bearishAlignment && !priceAboveEma20 && isStrongTrend) {
    return isVeryStrongTrend ? 'TRENDING_DOWN' : 'TRENDING_DOWN';
  }

  // Check for ranging
  const emaSpread = (Math.abs(ema.ema20 - ema.ema50) / ema.ema50) * 100;
  const isEmaConverged = emaSpread < 2; // EMAs within 2%

  if (isEmaConverged && adxValue < 20) {
    return 'RANGE_BOUND';
  }

  // Transitional regimes
  if (bullishAlignment && !isStrongTrend) {
    return 'TRENDING_UP';
  }

  if (bearishAlignment && !isStrongTrend) {
    return 'TRENDING_DOWN';
  }

  return 'RANGE_BOUND';
}

/**
 * Get regime from pre-calculated indicators (for performance)
 */
export function getMarketRegimeFromIndicators(
  ema: ReturnType<typeof calculateEMA>,
  adx: ReturnType<typeof calculateADX>,
  currentPrice: number
): MarketRegime {
  const adxValue = adx.adx;
  const isStrongTrend = adxValue > 25;
  const isVeryStrongTrend = adxValue > 40;

  const bullishAlignment = ema.ema20 > ema.ema50 && ema.ema50 > ema.ema200;
  const bearishAlignment = ema.ema20 < ema.ema50 && ema.ema50 < ema.ema200;

  const priceAboveEma20 = currentPrice > ema.ema20;

  if (bullishAlignment && priceAboveEma20 && isStrongTrend) {
    return isVeryStrongTrend ? 'TRENDING_UP' : 'TRENDING_UP';
  }

  if (bearishAlignment && !priceAboveEma20 && isStrongTrend) {
    return isVeryStrongTrend ? 'TRENDING_DOWN' : 'TRENDING_DOWN';
  }

  const emaSpread = (Math.abs(ema.ema20 - ema.ema50) / ema.ema50) * 100;
  const isEmaConverged = emaSpread < 2;

  if (isEmaConverged && adxValue < 20) {
    return 'RANGE_BOUND';
  }

  if (bullishAlignment && !isStrongTrend) {
    return 'TRENDING_UP';
  }

  if (bearishAlignment && !isStrongTrend) {
    return 'TRENDING_DOWN';
  }

  return 'RANGE_BOUND';
}
