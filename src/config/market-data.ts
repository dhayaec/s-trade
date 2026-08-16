/**
 * Market Data Configuration with Zod Validation
 * Provider settings, timeframes, cache TTLs from PLAN.md §8
 */
import { z } from 'zod';

/**
 * Timeframe enum
 */
export const TimeframeSchema = z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']);

export type Timeframe = z.infer<typeof TimeframeSchema>;

/**
 * Exchange enum
 */
export const ExchangeSchema = z.enum(['NSE', 'BSE', 'NYSE', 'NASDAQ']);

export type Exchange = z.infer<typeof ExchangeSchema>;

/**
 * Yahoo Finance provider config
 */
export const YahooFinanceConfigSchema = z.object({
  baseUrl: z.string().url().default('https://query1.finance.yahoo.com'),
  chartEndpoint: z.string().default('/v8/finance/chart'),
  searchEndpoint: z.string().default('/v1/finance/search'),
  timeout: z.number().int().positive().default(10000),
  maxRetries: z.number().int().min(0).max(5).default(3),
  retryDelayMs: z.number().int().positive().default(1000),
  rateLimitPerMinute: z.number().int().positive().default(60),
  userAgent: z.string().default('Mozilla/5.0 (compatible; S-Trade/1.0)'),
});

/**
 * Cache configuration
 */
export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttlSeconds: z.number().int().positive().default(300), // 5 minutes
  maxEntries: z.number().int().positive().default(1000),
  staleWhileRevalidate: z.number().int().nonnegative().default(60),
});

/**
 * Market data config
 */
export const MarketDataConfigSchema = z.object({
  defaultProvider: z.string().default('yahoo-finance'),
  providers: z.record(z.string(), YahooFinanceConfigSchema).optional(),
  cache: CacheConfigSchema.optional(),
  defaultTimeframes: z.array(TimeframeSchema).default(['1d', '4h', '1h']),
  defaultLookbackDays: z.record(z.string(), z.number().int().positive()).optional(),
  minCandlesForAnalysis: z.record(z.string(), z.number().int().positive()).optional(),
  symbolSearch: z
    .object({
      minQueryLength: z.number().int().positive().default(2),
      debounceMs: z.number().int().positive().default(300),
      maxResults: z.number().int().positive().default(20),
      cacheTtlSeconds: z.number().int().positive().default(3600), // 1 hour
    })
    .optional(),
});

/**
 * Default market data config
 */
export const DEFAULT_MARKET_DATA_CONFIG = MarketDataConfigSchema.parse({
  defaultProvider: 'yahoo-finance',
  providers: {
    'yahoo-finance': {
      baseUrl: 'https://query1.finance.yahoo.com',
      chartEndpoint: '/v8/finance/chart',
      searchEndpoint: '/v1/finance/search',
      timeout: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      rateLimitPerMinute: 60,
      userAgent: 'Mozilla/5.0 (compatible; S-Trade/1.0)',
    },
  },
  cache: {
    enabled: true,
    ttlSeconds: 300,
    maxEntries: 1000,
    staleWhileRevalidate: 60,
  },
  defaultTimeframes: ['1d', '4h', '1h'],
  defaultLookbackDays: {
    '1d': 730,
    '4h': 180,
    '1h': 90,
    '30m': 60,
    '15m': 30,
    '5m': 7,
    '1m': 1,
  },
  minCandlesForAnalysis: {
    '1d': 200,
    '4h': 200,
    '1h': 200,
  },
  symbolSearch: {
    minQueryLength: 2,
    debounceMs: 300,
    maxResults: 20,
    cacheTtlSeconds: 3600,
  },
});

/**
 * Validate market data config
 */
export function validateMarketDataConfig(config: unknown) {
  return MarketDataConfigSchema.parse(config);
}

/**
 * Timeframe to milliseconds
 */
export const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

/**
 * Get milliseconds for a timeframe
 */
export function getTimeframeMs(timeframe: Timeframe): number {
  return TIMEFRAME_MS[timeframe];
}

/**
 * Get Yahoo Finance interval string
 */
export const YAHOO_INTERVALS: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '60m',
  '4h': '4h',
  '1d': '1d',
  '1w': '1wk',
};

/**
 * Get Yahoo Finance interval for timeframe
 */
export function getYahooInterval(timeframe: Timeframe): string {
  return YAHOO_INTERVALS[timeframe];
}

/**
 * Timeframe ordering (shorter to longer)
 */
export const TIMEFRAME_ORDER: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

/**
 * Check if timeframe A is higher than timeframe B
 */
export function isHigherTimeframe(tfA: Timeframe, tfB: Timeframe): boolean {
  return TIMEFRAME_ORDER.indexOf(tfA) > TIMEFRAME_ORDER.indexOf(tfB);
}

/**
 * Validate timeframe
 */
export function validateTimeframe(tf: unknown): Timeframe {
  return TimeframeSchema.parse(tf);
}
