/**
 * Yahoo Finance Provider Implementation
 * Free market data provider for NSE/BSE and global symbols
 */

import type { Candle, Quote, Timeframe, SymbolSearchResult } from '@/types';
import { BaseMarketDataProvider } from './provider';
import { ProviderError, RateLimitError, SymbolNotFoundError } from './errors';

interface YahooChartResponse {
  chart: {
    result: YahooChartResult[] | null;
    error: YahooChartError | null;
  };
}

interface YahooChartResult {
  meta: YahooMeta;
  timestamp: number[];
  indicators: {
    quote: YahooQuote[];
    adjclose?: YahooAdjClose[];
  };
}

interface YahooMeta {
  symbol: string;
  currency: string;
  exchangeName: string;
  instrumentType: string;
  firstTradeDate: number;
  regularMarketTime: number;
  gmtoffset: number;
  timezone: string;
  exchangeTimezoneName: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  previousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
}

interface YahooQuote {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

interface YahooAdjClose {
  adjclose: number[];
}

interface YahooChartError {
  code: string;
  description: string;
}

interface YahooSearchResponse {
  quotes: YahooSearchQuote[];
  news: unknown[];
  nav: unknown[];
}

interface YahooSearchQuote {
  symbol: string;
  shortname: string;
  longname: string;
  exchDisp: string;
  typeDisp: string;
  quoteType: string;
  currency: string;
  market: string;
}

export class YahooFinanceProvider extends BaseMarketDataProvider {
  private baseUrl = 'https://query1.finance.yahoo.com';
  private searchUrl = 'https://query2.finance.yahoo.com/v1/finance/search';
  private requestDelay = 100; // ms between requests to respect rate limits
  private lastRequestTime = 0;

  async getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Candle[]> {
    await this.rateLimit();

    const period1 = Math.floor(from.getTime() / 1000);
    const period2 = Math.floor(to.getTime() / 1000);
    const interval = this.timeframeToYahooInterval(timeframe);

    const url = `${this.baseUrl}/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=false`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError('Yahoo Finance rate limit exceeded');
      }
      if (response.status === 404) {
        throw new SymbolNotFoundError(`Symbol not found: ${symbol}`);
      }
      throw new ProviderError(`Yahoo Finance API error: ${response.status}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error) {
      throw new ProviderError(`Yahoo Finance error: ${data.chart.error.description}`);
    }

    if (!data.chart.result || data.chart.result.length === 0) {
      throw new SymbolNotFoundError(`No data for symbol: ${symbol}`);
    }

    const result = data.chart.result[0];
    if (!result) {
      throw new SymbolNotFoundError(`No data for symbol: ${symbol}`);
    }
    return this.parseChartResult(result);
  }

  async getLatestQuote(symbol: string): Promise<Quote> {
    await this.rateLimit();

    // Use 1d chart with latest data
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;

    const url = `${this.baseUrl}/v8/finance/chart/${symbol}?period1=${dayAgo}&period2=${now}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError('Yahoo Finance rate limit exceeded');
      }
      throw new ProviderError(`Failed to fetch quote: ${response.status}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error || !data.chart.result?.length) {
      throw new SymbolNotFoundError(`No quote data for: ${symbol}`);
    }

    const result = data.chart.result[0];
    if (!result) {
      throw new SymbolNotFoundError(`No quote data for: ${symbol}`);
    }

    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    if (!quotes || !timestamps) {
      throw new SymbolNotFoundError(`No quote data for: ${symbol}`);
    }

    const latestIdx = timestamps.length - 1;
    const latestClose = quotes.close[latestIdx];
    const previousClose = meta.chartPreviousClose;

    if (latestClose === null || latestClose === undefined) {
      throw new SymbolNotFoundError(`No quote data for: ${symbol}`);
    }

    return {
      symbol,
      price: latestClose,
      change: latestClose - previousClose,
      changePercent: ((latestClose - previousClose) / previousClose) * 100,
      volume: quotes.volume[latestIdx] ?? 0,
      timestamp: (timestamps[latestIdx] ?? 0) * 1000,
      previousClose,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
    };
  }

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    await this.rateLimit();

    const url = `${this.searchUrl}?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new ProviderError(`Symbol search failed: ${response.status}`);
    }

    const data: YahooSearchResponse = await response.json();

    if (!data.quotes || data.quotes.length === 0) {
      return [];
    }

    return data.quotes
      .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map((q) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname,
        exchange: this.mapExchange(q.exchDisp),
        type: (q.quoteType as 'EQUITY' | 'ETF' | 'INDEX') ?? 'EQUITY',
        currency: q.currency,
      }));
  }

  private timeframeToYahooInterval(timeframe: Timeframe): string {
    switch (timeframe) {
      case '1d':
        return '1d';
      case '4h':
        return '4h';
      case '1h':
        return '1h';
      case '30m':
        return '30m';
      case '15m':
        return '15m';
      default:
        return '1d';
    }
  }

  private parseChartResult(result: YahooChartResult): Candle[] {
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose;

    if (!quotes || !timestamps) {
      return [];
    }

    const candles: Candle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const o = quotes.open[i];
      const h = quotes.high[i];
      const l = quotes.low[i];
      const c = quotes.close[i];
      const v = quotes.volume[i];
      // Skip null/undefined values (market closed, etc.)
      if (o == null || h == null || l == null || c == null || v == null) {
        continue;
      }

      candles.push({
        timestamp: (timestamps[i] ?? 0) * 1000, // Convert to ms
        open: o,
        high: h,
        low: l,
        close: adjClose ? (adjClose[i] ?? c) : c, // Use adjusted close if available
        volume: v,
      });
    }

    return candles;
  }

  private mapExchange(exchDisp: string): 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'LSE' | 'TSE' {
    const exchangeMap: Record<string, 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'LSE' | 'TSE'> = {
      NSE: 'NSE',
      BSE: 'BSE',
      NASDAQ: 'NASDAQ',
      NYSE: 'NYSE',
      LSE: 'LSE',
      TSE: 'TSE',
      'NSE India': 'NSE',
      'BSE India': 'BSE',
    };
    return exchangeMap[exchDisp] || 'NSE';
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }
}
