/**
 * Watchlist Service
 * CRUD operations over watchlists with in-memory storage (no DB dependency).
 * Includes a default watchlist seeded at construction time.
 */
import type {
  Watchlist,
  WatchlistSymbol,
  WatchlistAnalysisResult,
  WatchlistSymbolAnalysis,
  WatchlistSummary,
  ScanRequest,
} from '@/types/scanner';
import type { ScannerService } from '@/server/scanner/scanner-service';

export interface WatchlistCreateInput {
  name: string;
  description?: string;
  symbols?: Array<{ symbol: string; exchange: string; notes?: string }>;
}

export interface WatchlistUpdateInput {
  name?: string;
  description?: string;
}

export interface AddSymbolInput {
  symbol: string;
  exchange: string;
  notes?: string;
}

const DEFAULT_WATCHLIST_ID = 'default';
const DEFAULT_WATCHLIST_NAME = 'Default Watchlist';

export class WatchlistService {
  private readonly watchlists: Map<string, Watchlist> = new Map();
  private readonly scanner?: ScannerService;

  constructor(opts?: { scanner?: ScannerService; createDefault?: boolean }) {
    const createDefault = opts?.createDefault ?? true;
    if (createDefault) {
      this.createDefaultWatchlist();
    }
    if (opts?.scanner) {
      this.scanner = opts.scanner;
    }
  }

  /**
   * Create a brand-new default watchlist (NIFTY 50 style placeholders).
   * Idempotent: if a default already exists it is returned.
   */
  private createDefaultWatchlist(): Watchlist {
    const existing = this.watchlists.get(DEFAULT_WATCHLIST_ID);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const defaultSymbols: WatchlistSymbol[] = [
      { symbol: 'RELIANCE.NS', exchange: 'NSE', addedAt: now, notes: '' },
      { symbol: 'TCS.NS', exchange: 'NSE', addedAt: now, notes: '' },
      { symbol: 'HDFCBANK.NS', exchange: 'NSE', addedAt: now, notes: '' },
      { symbol: 'INFY.NS', exchange: 'NSE', addedAt: now, notes: '' },
      { symbol: 'ICICIBANK.NS', exchange: 'NSE', addedAt: now, notes: '' },
    ];

    const watchlist: Watchlist = {
      id: DEFAULT_WATCHLIST_ID,
      name: DEFAULT_WATCHLIST_NAME,
      description: 'System default watchlist',
      symbols: defaultSymbols,
      createdAt: now,
      updatedAt: now,
      isDefault: true,
    };

    this.watchlists.set(DEFAULT_WATCHLIST_ID, watchlist);
    return watchlist;
  }

  /**
   * Create a watchlist.
   */
  create(input: WatchlistCreateInput): Watchlist {
    const id = this.generateId();
    const now = new Date();

    const symbols: WatchlistSymbol[] = (input.symbols ?? []).map((s) => ({
      symbol: s.symbol,
      exchange: s.exchange,
      notes: s.notes ?? '',
      addedAt: now,
    }));

    const watchlist: Watchlist = {
      id,
      name: input.name,
      description: input.description ?? '',
      symbols,
      createdAt: now,
      updatedAt: now,
      isDefault: false,
    };

    this.watchlists.set(id, watchlist);
    return watchlist;
  }

  /**
   * Get a watchlist by id, or null if not found.
   */
  get(id: string): Watchlist | null {
    return this.watchlists.get(id) ?? null;
  }

  /**
   * List all watchlists (default first).
   */
  list(): Watchlist[] {
    return Array.from(this.watchlists.values()).sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Update a watchlist's metadata.
   */
  update(id: string, input: WatchlistUpdateInput): Watchlist | null {
    const watchlist = this.watchlists.get(id);
    if (!watchlist) {
      return null;
    }

    if (input.name !== undefined) {
      watchlist.name = input.name;
    }
    if (input.description !== undefined) {
      watchlist.description = input.description;
    }
    watchlist.updatedAt = new Date();

    this.watchlists.set(id, watchlist);
    return watchlist;
  }

  /**
   * Delete a watchlist (cannot delete the default).
   */
  delete(id: string): boolean {
    if (id === DEFAULT_WATCHLIST_ID) {
      return false;
    }
    return this.watchlists.delete(id);
  }

  /**
   * Add a symbol to a watchlist.
   * Returns the updated watchlist, or null if the watchlist doesn't exist.
   */
  addSymbol(id: string, input: AddSymbolInput): Watchlist | null {
    const watchlist = this.watchlists.get(id);
    if (!watchlist) {
      return null;
    }

    const exists = watchlist.symbols.some(
      (s) => s.symbol === input.symbol && s.exchange === input.exchange
    );
    if (!exists) {
      watchlist.symbols.push({
        symbol: input.symbol,
        exchange: input.exchange,
        notes: input.notes ?? '',
        addedAt: new Date(),
      });
      watchlist.updatedAt = new Date();
      this.watchlists.set(id, watchlist);
    }

    return watchlist;
  }

  /**
   * Remove a symbol from a watchlist.
   */
  removeSymbol(id: string, symbol: string, exchange: string): Watchlist | null {
    const watchlist = this.watchlists.get(id);
    if (!watchlist) {
      return null;
    }

    const before = watchlist.symbols.length;
    watchlist.symbols = watchlist.symbols.filter(
      (s) => !(s.symbol === symbol && s.exchange === exchange)
    );

    if (watchlist.symbols.length !== before) {
      watchlist.updatedAt = new Date();
      this.watchlists.set(id, watchlist);
    }

    return watchlist;
  }

  /**
   * Get the default watchlist.
   */
  getDefault(): Watchlist {
    return this.watchlists.get(DEFAULT_WATCHLIST_ID) as Watchlist;
  }

  /**
   * Analyze all symbols in a watchlist using the scanner (if available).
   */
  async analyze(
    id: string,
    timeframe: ScanRequest['timeframe'],
    strategies: ScanRequest['strategies']
  ): Promise<WatchlistAnalysisResult | null> {
    const watchlist = this.watchlists.get(id);
    if (!watchlist) {
      return null;
    }
    if (!this.scanner) {
      throw new Error('WatchlistService was not initialized with a ScannerService');
    }

    const request: ScanRequest = {
      symbols: watchlist.symbols.map((s) => s.symbol),
      timeframe,
      strategies,
    };

    const scan = await this.scanner.scanSymbols(request);

    const symbolAnalysis: WatchlistSymbolAnalysis[] = scan.results.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      price: r.price,
      changePercent: r.changePercent,
      trend: r.setup?.trend.direction ?? 'NEUTRAL',
      setupType: r.setup?.setupType ?? null,
      score: r.score,
      grade: r.grade,
      entry: r.setup?.entry ?? null,
      stopLoss: r.setup?.stopLoss ?? null,
      target: r.setup?.targets[0] ?? null,
      riskReward: r.setup?.riskReward ?? null,
      lastUpdated: r.timestamp,
    }));

    const withSetups = symbolAnalysis.filter((s) => s.setupType !== null);
    const withSetupsCount = withSetups.length;
    const avgScore =
      withSetupsCount > 0
        ? Math.round((withSetups.reduce((sum, s) => sum + s.score, 0) / withSetupsCount) * 100) /
          100
        : 0;

    const byGrade = { EXCELLENT: 0, STRONG: 0, MODERATE: 0, WEAK: 0, REJECT: 0 } as Record<
      WatchlistSymbolAnalysis['grade'],
      number
    >;
    for (const s of symbolAnalysis) {
      byGrade[s.grade] += 1;
    }

    const topSetup =
      withSetups.length > 0 ? [...withSetups].sort((a, b) => b.score - a.score)[0] : undefined;

    const summary: WatchlistSummary = {
      totalSymbols: symbolAnalysis.length,
      withSetups: withSetupsCount,
      avgScore,
      byGrade,
      topSetup,
    };

    return {
      watchlistId: id,
      watchlistName: watchlist.name,
      symbols: symbolAnalysis,
      summary,
      analyzedAt: scan.completedAt,
    };
  }

  private generateId(): string {
    return `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
