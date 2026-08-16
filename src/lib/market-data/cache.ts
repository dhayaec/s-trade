/**
 * Market Data Cache
 * In-memory cache with TTL for market data (later can be Redis-backed)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MarketDataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch and cache
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && entry.expiresAt > now) {
      return entry.data as T;
    }

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  /**
   * Get cached data (returns null if expired or missing)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Delete expired entries
   */
  prune(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Generate cache key for candles
   */
  static candleKey(symbol: string, timeframe: string, from: Date, to: Date): string {
    return `candles:${symbol}:${timeframe}:${from.getTime()}:${to.getTime()}`;
  }

  /**
   * Generate cache key for quote
   */
  static quoteKey(symbol: string): string {
    return `quote:${symbol}`;
  }

  /**
   * Generate cache key for symbol search
   */
  static searchKey(query: string): string {
    return `search:${query.toLowerCase()}`;
  }
}

// Singleton instance
export const marketDataCache = new MarketDataCache();

// Periodic pruning (every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(
    () => {
      marketDataCache.prune();
    },
    5 * 60 * 1000
  );
}
