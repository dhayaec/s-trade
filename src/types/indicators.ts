/**
 * Technical Indicator Domain Types
 * Structured results for all supported indicators
 */

export interface IndicatorResult<T> {
  value: T;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// EMA Values
export interface EMAValue {
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
}

export interface EMASeries {
  ema20: number[];
  ema50: number[];
  ema100: number[];
  ema200: number[];
  timestamps: number[];
}

// RSI
export interface RSIValue {
  rsi: number;
  signal: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
}

export interface RSISeries {
  values: number[];
  timestamps: number[];
}

// MACD
export interface MACDValue {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface MACDSeries {
  macd: number[];
  signal: number[];
  histogram: number[];
  timestamps: number[];
}

// ATR
export interface ATRValue {
  atr: number;
  atrPercent: number; // ATR as percentage of close
}

export interface ATRSeries {
  values: number[];
  timestamps: number[];
}

// ADX
export interface ADXValue {
  adx: number;
  plusDI: number;
  minusDI: number;
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface ADXSeries {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
  timestamps: number[];
}

// Volume
export interface VolumeValue {
  volume: number;
  volumeSMA20: number;
  relativeVolume: number; // volume / volumeSMA20
  signal: 'HIGH' | 'NORMAL' | 'LOW';
}

export interface VolumeSeries {
  volume: number[];
  volumeSMA20: number[];
  relativeVolume: number[];
  timestamps: number[];
}

// Previous High/Low
export interface PreviousLevelsValue {
  prevHigh: number;
  prevLow: number;
  prevClose: number;
  prevOpen: number;
  prevVolume: number;
  // Additional periods (optional)
  prevDayHigh?: number;
  prevDayLow?: number;
  prevWeekHigh?: number;
  prevWeekLow?: number;
  prevMonthHigh?: number;
  prevMonthLow?: number;
}

// Swing Points
export interface SwingPoint {
  index: number; // candle index
  price: number;
  type: 'HIGH' | 'LOW';
  timestamp: number;
  strength: number; // 0-100 based on lookback
}

export interface SwingPointsResult {
  highs: SwingPoint[];
  lows: SwingPoint[];
}
