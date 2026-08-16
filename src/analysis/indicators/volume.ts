/**
 * Volume Analysis - Volume SMA and Relative Volume
 * Pure TypeScript implementation
 */
import type { Candle } from '@/types/market-data';
import type { VolumeValue, VolumeSeries } from '@/types/indicators';

const VOLUME_SMA_PERIOD = 20;

/**
 * Calculate Volume SMA series.
 */
function calculateVolumeSMA(volumes: number[]): number[] {
  if (volumes.length < VOLUME_SMA_PERIOD) return [];

  const series: number[] = new Array(volumes.length).fill(NaN);
  for (let i = VOLUME_SMA_PERIOD - 1; i < volumes.length; i++) {
    const sum = volumes.slice(i - VOLUME_SMA_PERIOD + 1, i + 1).reduce((a, b) => a + b, 0);
    series[i] = sum / VOLUME_SMA_PERIOD;
  }
  return series;
}

/**
 * Calculate Volume metrics for the latest candle.
 */
export function calculateVolume(candles: Candle[]): VolumeValue {
  if (candles.length === 0) {
    return { volume: 0, volumeSMA20: 0, relativeVolume: 1, signal: 'NORMAL' };
  }

  const volumes = candles.map((c) => c.volume);
  const volume = volumes[volumes.length - 1] ?? 0;

  if (candles.length < VOLUME_SMA_PERIOD) {
    return { volume, volumeSMA20: volume, relativeVolume: 1, signal: 'NORMAL' };
  }

  const smaSeries = calculateVolumeSMA(volumes);
  const volumeSMA20 = smaSeries[smaSeries.length - 1] ?? volume;
  const relativeVolume = volumeSMA20 > 0 ? volume / volumeSMA20 : 1;

  let signal: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL';
  if (relativeVolume >= 1.5) signal = 'HIGH';
  else if (relativeVolume <= 0.5) signal = 'LOW';

  return { volume, volumeSMA20, relativeVolume, signal };
}

/**
 * Calculate full Volume series (for charting).
 */
export function calculateVolumeSeries(candles: Candle[]): VolumeSeries {
  if (candles.length === 0) {
    return { volume: [], volumeSMA20: [], relativeVolume: [], timestamps: [] };
  }

  const volumes = candles.map((c) => c.volume);
  const timestamps = candles.map((c) => c.timestamp);

  const volumeSMA20 = calculateVolumeSMA(volumes);
  const relativeVolume: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    const sma = volumeSMA20[i] ?? NaN;
    const vol = volumes[i] ?? 0;
    relativeVolume.push(!Number.isNaN(sma) && sma > 0 ? vol / sma : 1);
  }

  return { volume: volumes, volumeSMA20, relativeVolume, timestamps };
}
