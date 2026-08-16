/**
 * Strategy Domain Types
 * Strategy configuration, execution context, and results
 */

export type StrategyType = 'BREAKOUT' | 'PULLBACK' | 'SUPPORT_BOUNCE' | 'REVERSAL';

export interface StrategyConfig {
  // Universal
  minScore: number;
  minRiskReward: number;

  // Trend filters
  emaFast: number; // default 20
  emaSlow: number; // default 50
  emaTrend: number; // default 200
  requireEmaAlignment: boolean;

  // RSI
  rsiPeriod: number; // default 14
  rsiMin?: number; // e.g., 50 for bullish
  rsiMax?: number; // e.g., 70 avoid overbought

  // Volume
  volumePeriod: number; // default 20
  volumeMultiplier?: number; // e.g., 1.5x average

  // ATR
  atrPeriod: number; // default 14
  atrMultiplier?: number; // for SL distance

  // CPR
  useCPR: boolean;
  cprAlignmentRequired?: boolean;

  // Candlestick
  requireCandlestickConfirmation: boolean;
  minCandlestickScore?: number;

  // Structure
  requireStructureConfirmation: boolean;
  lookbackPeriod: number; // for swing detection

  // Multi-timeframe
  higherTimeframe: string; // e.g., '1D'
  setupTimeframe: string; // e.g., '4H'
  entryTimeframe: string; // e.g., '1H'
  requireHTFAlignment: boolean;
}

export interface StrategyConfigDefaults {
  [key: string]: StrategyConfig;
}

export interface AnalysisContext {
  // Market Data
  symbol: string;
  candles: {
    higher: Candle[]; // higher timeframe (e.g., 1D)
    setup: Candle[]; // setup timeframe (e.g., 4H)
    entry: Candle[]; // entry timeframe (e.g., 1H)
  };

  // Indicators (pre-calculated)
  indicators: {
    higher: IndicatorBundle;
    setup: IndicatorBundle;
    entry: IndicatorBundle;
  };

  // Price Action
  priceAction: {
    higher: PriceActionBundle;
    setup: PriceActionBundle;
    entry: PriceActionBundle;
  };

  // Candlestick Patterns
  patterns: {
    higher: CandlestickPattern[];
    setup: CandlestickPattern[];
    entry: CandlestickPattern[];
  };

  // CPR
  cpr: {
    higher: CPRAnalysis | null;
    setup: CPRAnalysis | null;
    entry: CPRAnalysis | null;
  };

  // Market Regime
  marketRegime: MarketRegime;

  // Current Price
  currentPrice: number;
  currentTimestamp: number;
}

export interface IndicatorBundle {
  ema: EMAValue;
  rsi: RSIValue;
  macd: MACDValue;
  atr: ATRValue;
  adx: ADXValue;
  volume: VolumeValue;
  prevLevels: PreviousLevelsValue;
}

export interface PriceActionBundle {
  structure: MarketStructure;
  supportZones: PriceZone[];
  resistanceZones: PriceZone[];
  breakouts: Breakout[];
  pullbacks: Pullback[];
  consolidation: ConsolidationRange | null;
}

export interface StrategyResult {
  setup: TradingSetup | null;
  signals: StrategySignal[];
  metadata: Record<string, unknown>;
}

export interface StrategySignal {
  type: 'ENTRY' | 'EXIT' | 'WARNING' | 'INFO';
  message: string;
  strength: number; // 0-100
  timestamp: number;
}

export interface StrategyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Import types from other modules
import type { Candle } from './market-data';
import type {
  EMAValue,
  RSIValue,
  MACDValue,
  ATRValue,
  ADXValue,
  VolumeValue,
  PreviousLevelsValue,
} from './indicators';
import type {
  MarketStructure,
  PriceZone,
  Breakout,
  Pullback,
  ConsolidationRange,
} from './price-action';
import type { CandlestickPattern } from './candlesticks';
import type { CPRAnalysis } from './cpr';
import type { TradingSetup, MarketRegime } from './setup';
