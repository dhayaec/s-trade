/**
 * Watchlist Service Singleton
 * Provides a shared WatchlistService instance with scanner configured.
 * Initialized lazily on first access.
 */
import { WatchlistService } from '@/server/watchlist/watchlist-service';
import { ScannerService } from '@/server/scanner/scanner-service';
import { createRealAnalysisSource } from '@/server/scanner/analysis-source';
import { YahooFinanceProvider } from '@/lib/market-data';
import type { StrategyType } from '@/types/strategy';
import type { ScanRequest } from '@/types/scanner';

let serviceInstance: WatchlistService | null = null;
let scannerInstance: ScannerService | null = null;

function createScanner(): ScannerService {
  const provider = new YahooFinanceProvider();
  const source = createRealAnalysisSource({
    provider,
    timeframe: '4h',
    strategies: ['BREAKOUT', 'PULLBACK', 'SUPPORT_BOUNCE', 'REVERSAL'],
  });
  return new ScannerService({ source, defaultConcurrency: 4 });
}

export function getWatchlistService(): WatchlistService {
  if (!serviceInstance) {
    if (!scannerInstance) {
      scannerInstance = createScanner();
    }
    serviceInstance = new WatchlistService({ scanner: scannerInstance, createDefault: true });
  }
  return serviceInstance;
}

export function getScannerService(): ScannerService {
  if (!scannerInstance) {
    scannerInstance = createScanner();
  }
  return scannerInstance;
}

/**
 * Validate and parse scan parameters from request
 */
export function parseScanParams(searchParams: URLSearchParams): {
  timeframe: ScanRequest['timeframe'];
  strategies: StrategyType[];
  minScore?: number;
  minRiskReward?: number;
} {
  const timeframe = (searchParams.get('timeframe') ?? '4h') as ScanRequest['timeframe'];
  const strategiesParam = searchParams.get('strategies');
  const strategies = strategiesParam
    ? strategiesParam.split(',').map((s) => s.trim().toUpperCase() as StrategyType)
    : (['BREAKOUT', 'PULLBACK', 'SUPPORT_BOUNCE', 'REVERSAL'] as StrategyType[]);

  const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined;
  const minRiskReward = searchParams.get('minRiskReward')
    ? Number(searchParams.get('minRiskReward'))
    : undefined;

  return {
    timeframe,
    strategies,
    ...(minScore !== undefined ? { minScore } : {}),
    ...(minRiskReward !== undefined ? { minRiskReward } : {}),
  };
}
