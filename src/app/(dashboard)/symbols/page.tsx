/**
 * Symbol Search Page
 * Debounced search input with symbol results, analyze + add to watchlist
 */
'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  X,
  LineChart,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

interface Watchlist {
  id: string;
  name: string;
  symbols: { symbol: string; exchange: string }[];
}

interface TradingSetup {
  entry: number;
  stopLoss: number;
  targets: number[];
  riskReward: number;
  direction: 'LONG' | 'SHORT';
  setupType: string;
  grade: 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'REJECT';
  explanation: string;
}

interface AnalysisResult {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  score: number;
  grade: 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'REJECT';
  setup: TradingSetup | null;
  trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

interface SymbolCardProps {
  symbol: SymbolSearchResult;
  onSelect: (symbol: SymbolSearchResult) => void;
  isSelected: boolean;
}

function SymbolCard({ symbol, onSelect, isSelected }: SymbolCardProps) {
  return (
    <button
      onClick={() => onSelect(symbol)}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{symbol.symbol}</p>
            <p className="text-sm text-slate-500">{symbol.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
            {symbol.exchange}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
            {symbol.type}
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
            {symbol.currency}
          </span>
        </div>
      </div>
    </button>
  );
}

const GRADE_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-emerald-100 text-emerald-700',
  STRONG: 'bg-green-100 text-green-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  WEAK: 'bg-orange-100 text-orange-700',
  REJECT: 'bg-red-100 text-red-700',
};

function trendIcon(trend?: string) {
  if (trend === 'BULLISH') return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (trend === 'BEARISH') return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

// ============ API Functions ============

async function fetchWatchlists(): Promise<Watchlist[]> {
  const res = await fetch('/api/watchlists');
  if (!res.ok) throw new Error('Failed to load watchlists');
  const data = await res.json();
  return data.watchlists as Watchlist[];
}

async function analyzeSymbol(
  symbol: string,
  exchange: string,
  timeframe: string,
  strategies: string[]
): Promise<AnalysisResult> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      exchange,
      timeframe,
      strategies,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Analysis failed');
  }
  const data = await res.json();
  return data.result as AnalysisResult;
}

async function addSymbolToWatchlist(
  id: string,
  symbol: string,
  exchange: string
): Promise<Watchlist> {
  const res = await fetch(`/api/watchlists/${id}/symbols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, exchange }),
  });
  if (!res.ok) throw new Error('Failed to add symbol');
  const data = await res.json();
  return data.watchlist as Watchlist;
}

// ============ Add to Watchlist Modal ============

function AddToWatchlistModal({
  open,
  onClose,
  symbol,
  exchange,
  watchlists,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  symbol: string;
  exchange: string;
  watchlists: Watchlist[];
  onAdd: (id: string) => Promise<unknown>;
}) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!open) return null;

  const handleAdd = async () => {
    if (!selectedId) {
      setError('Please select a watchlist');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(selectedId);
      setAddedIds((prev) => new Set(prev).add(selectedId));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  const isInWatchlist = (wl: Watchlist) =>
    wl.symbols.some((s) => s.symbol === symbol && s.exchange === exchange);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add {symbol} to Watchlist</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {watchlists.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No watchlists yet. Create one from the Watchlists page.
          </p>
        ) : (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {watchlists.map((wl) => {
                const inWl = isInWatchlist(wl);
                const added = addedIds.has(wl.id);
                return (
                  <label
                    key={wl.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                      selectedId === wl.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:bg-slate-50',
                      (inWl || added) && 'opacity-60'
                    )}
                  >
                    <input
                      type="radio"
                      name="watchlist"
                      value={wl.id}
                      checked={selectedId === wl.id}
                      disabled={inWl || added}
                      onChange={() => setSelectedId(wl.id)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{wl.name}</p>
                      <p className="text-xs text-slate-500">
                        {wl.symbols.length} symbol{wl.symbols.length === 1 ? '' : 's'}
                        {inWl ? ' · Already added' : added ? ' · Added' : ''}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedId || submitting}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ Analysis Results Modal ============

function AnalysisModal({
  open,
  onClose,
  symbol,
  exchange,
  result,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  symbol: string;
  exchange: string;
  result: AnalysisResult | null;
  loading: boolean;
}) {
  if (!open) return null;

  const setup = result?.setup;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{symbol}</h2>
            <p className="text-sm text-slate-500">{exchange}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-slate-500">Analyzing...</span>
          </div>
        ) : result ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Price</p>
                <p className="font-bold text-slate-900">₹{result.price.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Change</p>
                <p
                  className={cn(
                    'font-bold',
                    result.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {result.changePercent >= 0 ? '+' : ''}
                  {result.changePercent.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Score</p>
                <p className="font-bold text-slate-900">{result.score}</p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <span
                className={cn('px-2 py-1 text-xs font-medium rounded', GRADE_COLORS[result.grade])}
              >
                {result.grade}
              </span>
              {result.trend && (
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  Trend: {trendIcon(result.trend)} {result.trend}
                </span>
              )}
            </div>

            {setup ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-700">Setup: {setup.setupType}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Direction</p>
                    <p className="font-medium capitalize">{setup.direction.toLowerCase()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">R:R</p>
                    <p className="font-medium">{setup.riskReward.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Entry</p>
                    <p className="font-medium">₹{setup.entry.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Stop Loss</p>
                    <p className="font-medium text-red-600">₹{setup.stopLoss.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Target 1</p>
                    <p className="font-medium text-emerald-600">
                      ₹{setup.targets[0]?.toFixed(2) ?? '—'}
                    </p>
                  </div>
                  {setup.targets[1] && (
                    <div>
                      <p className="text-slate-500">Target 2</p>
                      <p className="font-medium text-emerald-600">₹{setup.targets[1].toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 p-3 rounded-lg bg-slate-50 text-sm text-slate-700">
                  {setup.explanation}
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">No actionable setup found.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function SearchResults({
  query,
  onSelect,
  selectedSymbol,
}: {
  query: string;
  onSelect: (symbol: SymbolSearchResult) => void;
  selectedSymbol: SymbolSearchResult | null;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['symbols', query],
    queryFn: async (): Promise<SymbolSearchResult[]> => {
      const response = await fetch(`/api/symbols?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: query.length >= 1,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        <span className="ml-2 text-slate-500">Searching...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-8 text-red-500">
        <XCircle className="w-5 h-5 mr-2" />
        <span>Error: {error instanceof Error ? error.message : 'Unknown error'}</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <Info className="w-5 h-5 mr-2" />
        <span>No symbols found for &quot;{query}&quot;</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {data.map((symbol) => (
        <SymbolCard
          key={symbol.symbol}
          symbol={symbol}
          onSelect={onSelect}
          isSelected={selectedSymbol?.symbol === symbol.symbol}
        />
      ))}
    </div>
  );
}

export default function SymbolsPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolSearchResult | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const queryClient = useQueryClient();

  // Fetch watchlists for the add-to-watchlist modal
  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists'],
    queryFn: fetchWatchlists,
    staleTime: 30_000,
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: ({
      symbol,
      exchange,
      timeframe,
      strategies,
    }: {
      symbol: string;
      exchange: string;
      timeframe: string;
      strategies: string[];
    }) => analyzeSymbol(symbol, exchange, timeframe, strategies),
    onSuccess: (data) => {
      setAnalysisResult(data);
      setAnalysisLoading(false);
    },
    onError: (error) => {
      console.error('Analysis failed:', error);
      setAnalysisResult(null);
      setAnalysisLoading(false);
    },
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: ({ id, symbol, exchange }: { id: string; symbol: string; exchange: string }) =>
      addSymbolToWatchlist(id, symbol, exchange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  // Debounce the search query
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const timer = setTimeout(() => {
        setDebouncedQuery(value);
      }, 300);
      setDebounceTimer(timer);
    },
    [debounceTimer]
  );

  const handleSymbolSelect = useCallback((symbol: SymbolSearchResult) => {
    setSelectedSymbol(symbol);
    setAnalysisResult(null);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!selectedSymbol) return;
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    analyzeMutation.mutate({
      symbol: selectedSymbol.symbol,
      exchange: selectedSymbol.exchange,
      timeframe: '4h',
      strategies: ['BREAKOUT', 'PULLBACK', 'SUPPORT_BOUNCE', 'REVERSAL'],
    });
  }, [selectedSymbol, analyzeMutation]);

  const handleAddToWatchlist = useCallback(() => {
    if (!selectedSymbol) return;
    setWatchlistOpen(true);
  }, [selectedSymbol]);

  const handleWatchlistAdd = useCallback(
    (id: string) => {
      if (!selectedSymbol) return Promise.reject(new Error('No symbol selected'));
      return addToWatchlistMutation.mutateAsync({
        id,
        symbol: selectedSymbol.symbol,
        exchange: selectedSymbol.exchange,
      });
    },
    [selectedSymbol, addToWatchlistMutation]
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Symbol Search</h1>
          <p className="mt-2 text-slate-600">
            Search for NSE/BSE symbols to analyze. Powered by Yahoo Finance.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="relative mb-6">
            <label htmlFor="symbol-search" className="sr-only">
              Search symbols
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id="symbol-search"
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Enter symbol (e.g., RELI, TCS, HDFC)..."
                className="w-full pl-10 pr-4 py-3 text-lg border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {debouncedQuery && (
            <div className="pt-4 border-t border-slate-200">
              <h2 className="text-sm font-medium text-slate-500 mb-3">
                Results for &quot;{debouncedQuery}&quot;
              </h2>
              <SearchResults
                query={debouncedQuery}
                onSelect={handleSymbolSelect}
                selectedSymbol={selectedSymbol}
              />
            </div>
          )}

          {selectedSymbol && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Selected Symbol</p>
                  <p className="text-xl font-bold text-slate-900">{selectedSymbol.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">{selectedSymbol.exchange}</p>
                  <p className="text-sm text-slate-500">{selectedSymbol.currency}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{selectedSymbol.name}</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LineChart className="w-4 h-4" />
                  )}
                  Analyze
                </button>
                <button
                  onClick={handleAddToWatchlist}
                  className="flex flex-1 items-center justify-center gap-2 py-2 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Add to Watchlist
                </button>
              </div>
            </div>
          )}

          {!debouncedQuery && !selectedSymbol && (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Enter a symbol to search</p>
            </div>
          )}
        </div>
      </div>

      {selectedSymbol && (
        <AnalysisModal
          open={analysisOpen}
          onClose={() => setAnalysisOpen(false)}
          symbol={selectedSymbol.symbol}
          exchange={selectedSymbol.exchange}
          result={analysisResult}
          loading={analysisLoading}
        />
      )}

      <AddToWatchlistModal
        open={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        symbol={selectedSymbol?.symbol ?? ''}
        exchange={selectedSymbol?.exchange ?? ''}
        watchlists={watchlists}
        onAdd={handleWatchlistAdd}
      />
    </div>
  );
}
