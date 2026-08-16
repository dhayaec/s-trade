import { describe, expect, it, vi, beforeEach } from 'vitest';
import { YahooFinanceProvider } from '@/lib/market-data/yahoo-finance';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('YahooFinanceProvider', () => {
  let provider: YahooFinanceProvider;

  beforeEach(() => {
    provider = new YahooFinanceProvider();
    mockFetch.mockReset();
  });

  describe('searchSymbols', () => {
    it('should return empty array for empty query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: [], news: [], nav: [] }),
      });

      const results = await provider.searchSymbols('');
      expect(results).toEqual([]);
    });

    it('should return mapped symbol results for valid query', async () => {
      const mockResponse = {
        quotes: [
          {
            symbol: 'RELIANCE.NS',
            shortname: 'Reliance Industries',
            longname: 'Reliance Industries Limited',
            exchDisp: 'NSE',
            typeDisp: 'Equity',
            quoteType: 'EQUITY',
            currency: 'INR',
            market: 'in_market',
          },
          {
            symbol: 'TCS.NS',
            shortname: 'Tata Consultancy',
            longname: 'Tata Consultancy Services Limited',
            exchDisp: 'NSE',
            typeDisp: 'Equity',
            quoteType: 'EQUITY',
            currency: 'INR',
            market: 'in_market',
          },
        ],
        news: [],
        nav: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchSymbols('RELI');

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        exchange: 'NSE',
        type: 'EQUITY',
        currency: 'INR',
      });
      expect(results[1]).toMatchObject({
        symbol: 'TCS.NS',
        name: 'Tata Consultancy Services Limited',
        exchange: 'NSE',
        type: 'EQUITY',
        currency: 'INR',
      });
    });

    it('should filter out non-equity/ETF types', async () => {
      const mockResponse = {
        quotes: [
          {
            symbol: 'RELIANCE.NS',
            shortname: 'Reliance',
            longname: 'Reliance Industries Limited',
            exchDisp: 'NSE',
            typeDisp: 'Equity',
            quoteType: 'EQUITY',
            currency: 'INR',
            market: 'in_market',
          },
          {
            symbol: 'MUTUAL_FUND',
            shortname: 'Some Fund',
            longname: 'Some Mutual Fund',
            exchDisp: 'NSE',
            typeDisp: 'Mutual Fund',
            quoteType: 'MUTUALFUND',
            currency: 'INR',
            market: 'in_market',
          },
        ],
        news: [],
        nav: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchSymbols('RELI');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('RELIANCE.NS');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(provider.searchSymbols('RELI')).rejects.toThrow('Symbol search failed: 500');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(provider.searchSymbols('RELI')).rejects.toThrow('Network error');
    });

    it('should respect rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: [], news: [], nav: [] }),
      });

      await provider.searchSymbols('RELI');
      await provider.searchSymbols('TCS');

      // Should have been called twice
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLatestQuote', () => {
    it('should return quote data for valid symbol', async () => {
      const mockResponse = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'RELIANCE.NS',
                currency: 'INR',
                exchangeName: 'NSE',
                instrumentType: 'EQUITY',
                firstTradeDate: 1234567890,
                regularMarketTime: 1699999999,
                gmtoffset: 19800,
                timezone: 'Asia/Kolkata',
                exchangeTimezoneName: 'Asia/Kolkata',
                regularMarketPrice: 2500,
                chartPreviousClose: 2480,
                previousClose: 2480,
                regularMarketDayHigh: 2520,
                regularMarketDayLow: 2470,
                regularMarketVolume: 1000000,
              },
              timestamp: [1699999999],
              indicators: {
                quote: [
                  {
                    open: [2490],
                    high: [2520],
                    low: [2470],
                    close: [2500],
                    volume: [1000000],
                  },
                ],
                adjclose: [
                  {
                    adjclose: [2500],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const quote = await provider.getLatestQuote('RELIANCE.NS');

      expect(quote).toMatchObject({
        symbol: 'RELIANCE.NS',
        price: 2500,
        change: 20,
        changePercent: (20 / 2480) * 100,
        volume: 1000000,
        previousClose: 2480,
        dayHigh: 2520,
        dayLow: 2470,
      });
      expect(quote.timestamp).toBe(1699999999000);
    });

    it('should throw SymbolNotFoundError for invalid symbol', async () => {
      const mockResponse = {
        chart: {
          result: null,
          error: {
            code: 'Not Found',
            description: 'No data found',
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(provider.getLatestQuote('INVALID')).rejects.toThrow(
        'No quote data for: INVALID'
      );
    });

    it('should handle rate limit error (429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect(provider.getLatestQuote('RELIANCE.NS')).rejects.toThrow(
        'Yahoo Finance rate limit exceeded'
      );
    });
  });

  describe('getHistoricalCandles', () => {
    it('should return historical candles for valid symbol and timeframe', async () => {
      const mockResponse = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'RELIANCE.NS',
                currency: 'INR',
                exchangeName: 'NSE',
                instrumentType: 'EQUITY',
                firstTradeDate: 1234567890,
                regularMarketTime: 1699999999,
                gmtoffset: 19800,
                timezone: 'Asia/Kolkata',
                exchangeTimezoneName: 'Asia/Kolkata',
                regularMarketPrice: 2500,
                chartPreviousClose: 2480,
                previousClose: 2480,
                regularMarketDayHigh: 2520,
                regularMarketDayLow: 2470,
                regularMarketVolume: 1000000,
              },
              timestamp: [1699900000, 1699986400],
              indicators: {
                quote: [
                  {
                    open: [2480, 2490],
                    high: [2500, 2520],
                    low: [2470, 2480],
                    close: [2490, 2500],
                    volume: [500000, 500000],
                  },
                ],
                adjclose: [
                  {
                    adjclose: [2490, 2500],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const from = new Date('2023-11-13');
      const to = new Date('2023-11-14');
      const candles = await provider.getHistoricalCandles('RELIANCE.NS', '1d', from, to);

      expect(candles).toHaveLength(2);
      expect(candles[0]).toMatchObject({
        timestamp: 1699900000000,
        open: 2480,
        high: 2500,
        low: 2470,
        close: 2490,
        volume: 500000,
      });
      expect(candles[1]).toMatchObject({
        timestamp: 1699986400000,
        open: 2490,
        high: 2520,
        low: 2480,
        close: 2500,
        volume: 500000,
      });
    });

    it('should skip candles with null values', async () => {
      const mockResponse = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'RELIANCE.NS',
                currency: 'INR',
                exchangeName: 'NSE',
                instrumentType: 'EQUITY',
                firstTradeDate: 1234567890,
                regularMarketTime: 1699999999,
                gmtoffset: 19800,
                timezone: 'Asia/Kolkata',
                exchangeTimezoneName: 'Asia/Kolkata',
                regularMarketPrice: 2500,
                chartPreviousClose: 2480,
                previousClose: 2480,
                regularMarketDayHigh: 2520,
                regularMarketDayLow: 2470,
                regularMarketVolume: 1000000,
              },
              timestamp: [1699900000, 1699986400],
              indicators: {
                quote: [
                  {
                    open: [2480, null],
                    high: [2500, 2520],
                    low: [2470, 2480],
                    close: [2490, 2500],
                    volume: [500000, 500000],
                  },
                ],
              },
            },
          ],
          error: null,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const from = new Date('2023-11-13');
      const to = new Date('2023-11-14');
      const candles = await provider.getHistoricalCandles('RELIANCE.NS', '1d', from, to);

      expect(candles).toHaveLength(1);
      expect(candles[0].open).toBe(2480);
    });

    it('should throw SymbolNotFoundError for 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const from = new Date('2023-11-13');
      const to = new Date('2023-11-14');
      await expect(provider.getHistoricalCandles('INVALID', '1d', from, to)).rejects.toThrow(
        'Symbol not found: INVALID'
      );
    });

    it('should throw RateLimitError for 429', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      });

      const from = new Date('2023-11-13');
      const to = new Date('2023-11-14');
      await expect(provider.getHistoricalCandles('RELIANCE.NS', '1d', from, to)).rejects.toThrow(
        'Yahoo Finance rate limit exceeded'
      );
    });
  });
});
