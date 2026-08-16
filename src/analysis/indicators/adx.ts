/**
 * Average Directional Index (ADX) - 14 period
 * Pure TypeScript implementation
 */
import type { Candle } from '@/types/market-data';
import type { ADXValue, ADXSeries } from '@/types/indicators';

const ADX_PERIOD = 14;

interface DirectionalMovement {
  plusDM: number[];
  minusDM: number[];
  tr: number[];
}

/**
 * Calculate Directional Movement (+DM, -DM) and True Range.
 */
function calculateDirectionalMovements(candles: Candle[]): DirectionalMovement {
  const plusDM: number[] = new Array(candles.length).fill(0);
  const minusDM: number[] = new Array(candles.length).fill(0);
  const tr: number[] = new Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i] as Candle;
    const prev = candles[i - 1] as Candle;

    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;

    const hl = curr.high - curr.low;
    const hc = Math.abs(curr.high - prev.close);
    const lc = Math.abs(curr.low - prev.close);
    tr[i] = Math.max(hl, hc, lc);
  }

  return { plusDM, minusDM, tr };
}

/**
 * Calculate ADX series using Wilder's smoothing.
 */
function calculateADXSeries(candles: Candle[]): {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
} {
  if (candles.length < ADX_PERIOD * 2) {
    return { adx: [], plusDI: [], minusDI: [] };
  }

  const { plusDM, minusDM, tr } = calculateDirectionalMovements(candles);
  const alpha = 1 / ADX_PERIOD;

  // Initial smoothing
  let smoothPlusDM = plusDM.slice(1, ADX_PERIOD + 1).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(1, ADX_PERIOD + 1).reduce((a, b) => a + b, 0);
  let smoothTR = tr.slice(1, ADX_PERIOD + 1).reduce((a, b) => a + b, 0);

  const plusDI: number[] = new Array(candles.length).fill(NaN);
  const minusDI: number[] = new Array(candles.length).fill(NaN);
  const dx: number[] = new Array(candles.length).fill(NaN);

  const calcDI = (smoothDM: number, smoothTrueRange: number) =>
    smoothTrueRange > 0 ? (smoothDM / smoothTrueRange) * 100 : 0;

  // First calculation
  const firstPlusDI = calcDI(smoothPlusDM, smoothTR);
  const firstMinusDI = calcDI(smoothMinusDM, smoothTR);
  plusDI[ADX_PERIOD] = firstPlusDI;
  minusDI[ADX_PERIOD] = firstMinusDI;
  dx[ADX_PERIOD] =
    firstPlusDI + firstMinusDI > 0
      ? (Math.abs(firstPlusDI - firstMinusDI) / (firstPlusDI + firstMinusDI)) * 100
      : 0;

  // Continue smoothing
  for (let i = ADX_PERIOD + 1; i < candles.length; i++) {
    const plusDMi = plusDM[i] ?? 0;
    const minusDMi = minusDM[i] ?? 0;
    const trI = tr[i] ?? 0;
    smoothPlusDM = (plusDMi - smoothPlusDM) * alpha + smoothPlusDM;
    smoothMinusDM = (minusDMi - smoothMinusDM) * alpha + smoothMinusDM;
    smoothTR = (trI - smoothTR) * alpha + smoothTR;

    const currPlusDI = calcDI(smoothPlusDM, smoothTR);
    const currMinusDI = calcDI(smoothMinusDM, smoothTR);
    plusDI[i] = currPlusDI;
    minusDI[i] = currMinusDI;

    const dxVal =
      currPlusDI + currMinusDI > 0
        ? (Math.abs(currPlusDI - currMinusDI) / (currPlusDI + currMinusDI)) * 100
        : 0;
    dx[i] = dxVal;
  }

  // ADX = smoothed DX
  const adx: number[] = new Array(candles.length).fill(NaN);
  let adxSmooth = 0;
  for (let i = ADX_PERIOD; i < ADX_PERIOD * 2; i++) {
    const dxI = dx[i];
    if (dxI !== undefined && !Number.isNaN(dxI)) adxSmooth += dxI;
  }
  adxSmooth /= ADX_PERIOD;
  adx[ADX_PERIOD * 2 - 1] = adxSmooth;

  for (let i = ADX_PERIOD * 2; i < candles.length; i++) {
    const dxI = dx[i];
    if (dxI !== undefined && !Number.isNaN(dxI)) {
      adxSmooth = (dxI - adxSmooth) * alpha + adxSmooth;
      adx[i] = adxSmooth;
    }
  }

  return { adx, plusDI, minusDI };
}

/**
 * Calculate ADX (14) for the latest candle.
 */
export function calculateADX(candles: Candle[]): ADXValue {
  if (candles.length < ADX_PERIOD * 2) {
    return {
      adx: 0,
      plusDI: 0,
      minusDI: 0,
      trendStrength: 'NONE',
      trendDirection: 'NEUTRAL',
    };
  }

  const { adx, plusDI, minusDI } = calculateADXSeries(candles);
  const lastIndex = candles.length - 1;

  const adxValue = adx[lastIndex] ?? 0;
  const plusDIValue = plusDI[lastIndex] ?? 0;
  const minusDIValue = minusDI[lastIndex] ?? 0;

  let trendStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE' = 'NONE';
  if (adxValue >= 25) trendStrength = 'STRONG';
  else if (adxValue >= 20) trendStrength = 'MODERATE';
  else if (adxValue >= 15) trendStrength = 'WEAK';

  let trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (plusDIValue > minusDIValue) trendDirection = 'BULLISH';
  else if (minusDIValue > plusDIValue) trendDirection = 'BEARISH';

  return {
    adx: Number.isNaN(adxValue) ? 0 : adxValue,
    plusDI: Number.isNaN(plusDIValue) ? 0 : plusDIValue,
    minusDI: Number.isNaN(minusDIValue) ? 0 : minusDIValue,
    trendStrength,
    trendDirection,
  };
}

/**
 * Calculate full ADX series (for charting).
 */
export function calculateADXSeriesFull(candles: Candle[]): ADXSeries {
  if (candles.length < ADX_PERIOD * 2) {
    return { adx: [], plusDI: [], minusDI: [], timestamps: [] };
  }

  const { adx, plusDI, minusDI } = calculateADXSeries(candles);
  const timestamps = candles.map((c) => c.timestamp);

  return { adx, plusDI, minusDI, timestamps };
}
