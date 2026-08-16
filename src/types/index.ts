/**
 * Domain Types - Main Export
 * Re-exports all type modules for convenient importing
 */

// Market Data
export * from './market-data';

// Symbol
export * from './symbol';

// Setup
export {
  type SetupDirection,
  type SetupType,
  type Confirmation,
  type Invalidation,
  type TradingSetup,
  type MarketRegime,
  type TrendAnalysis,
  type SetupFilters,
} from './setup';

// Indicators
export type {
  IndicatorResult,
  EMAValue,
  EMASeries,
  RSIValue,
  RSISeries,
  MACDValue,
  MACDSeries,
  ATRValue,
  ATRSeries,
  ADXValue,
  ADXSeries,
  VolumeValue,
  VolumeSeries,
  PreviousLevelsValue,
  SwingPoint as IndicatorSwingPoint,
  SwingPointsResult,
} from './indicators';

// Price Action
export * from './price-action';

// Candlesticks
export * from './candlesticks';

// CPR
export * from './cpr';

// Strategy
export * from './strategy';

// Risk
export * from './risk';

// Scoring
export {
  type ScoreWeights,
  type ScoreThresholds,
  type ScoreWeightsConfig,
  type SetupScore,
  type ScoreBreakdown,
  type SetupGrade,
  type ScoringContext,
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_SCORE_THRESHOLDS,
  DEFAULT_SCORE_CONFIG,
  calculateGrade,
  validateWeights,
} from './scoring';

// Backtest
export * from './backtest';

// Scanner
export * from './scanner';
