/**
 * Market Data Provider Interface
 * Abstract interface for market data providers (Yahoo Finance, mock, etc.)
 */

import type { MarketDataProvider, Candle, Quote, Timeframe, SymbolSearchResult } from '@/types';

export {
  type MarketDataProvider,
  type Candle,
  type Quote,
  type Timeframe,
  type SymbolSearchResult,
} from '@/types';

export abstract class BaseMarketDataProvider implements MarketDataProvider {
  abstract getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Candle[]>;

  abstract getLatestQuote(symbol: string): Promise<Quote>;

  abstract searchSymbols(query: string): Promise<SymbolSearchResult[]>;

  /**
   * Convert timeframe to Yahoo Finance format
   */
  protected timeframeToYahoo(timeframe: Timeframe): {
    interval: string;
    period1: number;
    period2: number;
  } {
    const now = Math.floor(Date.now() / 1000);
    let interval: string;

    switch (timeframe) {
      case '1d':
        interval = '1d';
        break;
      case '4h':
        interval = '4h';
        break;
      case '1h':
        interval = '1h';
        break;
      case '30m':
        interval = '30m';
        break;
      case '15m':
        interval = '15m';
        break;
      default:
        interval = '1d';
    }

    return { interval, period1: 0, period2: now };
  }

  /**
   * Normalize Yahoo Finance candle to our Candle type
   */
  protected normalizeCandle(yahooCandle: YahooCandle, timestamp: number): Candle {
    return {
      timestamp,
      open: yahooCandle.open,
      high: yahooCandle.high,
      low: yahooCandle.low,
      close: yahooCandle.close,
      volume: yahooCandle.volume,
    };
  }
}

interface YahooCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date?: number; // Unix timestamp
}
