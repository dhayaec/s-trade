/**
 * Market Data Domain Types
 * Core types for OHLCV candles, quotes, timeframes, and provider abstraction
 */

export type Timeframe = '1d' | '4h' | '1h' | '30m' | '15m';

export interface Candle {
  timestamp: number; // Unix milliseconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Chart data point for lightweight-charts
export interface MarketDataPoint {
  time: string | number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
}

export interface MarketDataProvider {
  /**
   * Fetch historical candles for a symbol and timeframe
   * @param symbol - Trading symbol (e.g., "RELIANCE.NS" for NSE)
   * @param timeframe - Candle timeframe
   * @param from - Start date (inclusive)
   * @param to - End date (inclusive)
   * @returns Array of candles sorted by timestamp ascending
   */
  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Candle[]>;

  /**
   * Get latest quote for a symbol
   */
  getLatestQuote(symbol: string): Promise<Quote>;

  /**
   * Search symbols by query (for symbol search autocomplete)
   */
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: 'EQUITY' | 'ETF' | 'INDEX';
  currency?: string;
}

export interface OHLCVResponse {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  nextPageToken?: string;
}
