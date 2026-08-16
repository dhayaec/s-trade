/**
 * Scanner Domain Types
 * Bulk scanning, watchlists, and scan results
 */

export interface ScanRequest {
  symbols: string[];
  timeframe: '1d' | '4h' | '1h';
  strategies: StrategyType[];
  minScore?: number;
  minRiskReward?: number;
  maxConcurrency?: number;
  filters?: ScanFilters;
}

export interface ScanFilters {
  trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'ALL';
  setupTypes?: SetupType[];
  scoreRange?: { min: number; max: number };
  riskRewardRange?: { min: number; max: number };
  volumeMultiplier?: number; // minimum relative volume
  marketCap?: { min?: number; max?: number };
  sector?: string[];
  marketRegime?: MarketRegime[];
}

export interface ScanResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  setup: TradingSetup | null;
  score: number;
  grade: SetupGrade;
  timestamp: number;
  error?: string; // if analysis failed
}

export interface ScanResponse {
  results: ScanResult[];
  summary: ScanSummary;
  startedAt: number;
  completedAt: number;
}

export interface ScanSummary {
  totalScanned: number;
  successful: number;
  failed: number;
  byGrade: Record<SetupGrade, number>;
  bySetupType: Record<SetupType, number>;
  topOpportunities: ScanResult[]; // top 10 by score
  avgScore: number;
  avgRiskReward: number;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  symbols: WatchlistSymbol[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

export interface WatchlistSymbol {
  symbol: string;
  exchange: string;
  addedAt: Date;
  notes?: string;
  // Cached analysis (refreshed periodically)
  lastAnalysis?: {
    timestamp: number;
    setup: TradingSetup | null;
    score: number;
  };
}

export interface WatchlistAnalysisResult {
  watchlistId: string;
  watchlistName: string;
  symbols: WatchlistSymbolAnalysis[];
  summary: WatchlistSummary;
  analyzedAt: number;
}

export interface WatchlistSymbolAnalysis {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  trend: TrendAnalysis['direction'];
  setupType: SetupType | null;
  score: number;
  grade: SetupGrade;
  entry: number | null;
  stopLoss: number | null;
  target: number | null;
  riskReward: number | null;
  lastUpdated: number;
}

export interface WatchlistSummary {
  totalSymbols: number;
  withSetups: number;
  avgScore: number;
  byGrade: Record<SetupGrade, number>;
  topSetup?: WatchlistSymbolAnalysis;
}

// Import types
import type { StrategyType } from './strategy';
import type { SetupType, MarketRegime, TradingSetup, SetupGrade, TrendAnalysis } from './setup';
