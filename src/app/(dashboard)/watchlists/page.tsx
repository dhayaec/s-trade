'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Loader2,
  X,
  LineChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============

interface WatchlistSymbol {
  symbol: string;
  exchange: string;
  addedAt: string;
  notes: string;
}

interface Watchlist {
  id: string;
  name: string;
  description: string;
  symbols: WatchlistSymbol[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

interface WatchlistSymbolAnalysis {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  setupType: string | null;
  score: number;
  grade: 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'REJECT';
  entry: number | null;
  stopLoss: number | null;
  target: number | null;
  riskReward: number | null;
  lastUpdated: number;
}

interface WatchlistSummary {
  totalSymbols: number;
  withSetups: number;
  avgScore: number;
  byGrade: Record<string, number>;
  topSetup: WatchlistSymbolAnalysis | undefined;
}

interface WatchlistAnalysisResult {
  watchlistId: string;
  watchlistName: string;
  symbols: WatchlistSymbolAnalysis[];
  summary: WatchlistSummary;
  analyzedAt: number;
}

const GRADE_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-emerald-100 text-emerald-700',
  STRONG: 'bg-green-100 text-green-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  WEAK: 'bg-orange-100 text-orange-700',
  REJECT: 'bg-red-100 text-red-700',
};

function trendIcon(trend: string) {
  if (trend === 'BULLISH') return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (trend === 'BEARISH') return <TrendingDown className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

// ============ API helpers ============

async function fetchWatchlists(): Promise<Watchlist[]> {
  const res = await fetch('/api/watchlists');
  if (!res.ok) throw new Error('Failed to load watchlists');
  const data = await res.json();
  return data.watchlists;
}

async function createWatchlist(name: string, description?: string): Promise<Watchlist> {
  const body: { name: string; description?: string } = { name };
  if (description !== undefined) body.description = description;
  const res = await fetch('/api/watchlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create watchlist');
  const data = await res.json();
  return data.watchlist;
}

async function deleteWatchlist(id: string): Promise<void> {
  const res = await fetch(`/api/watchlists/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete watchlist');
}

async function addSymbol(id: string, symbol: string, exchange: string): Promise<Watchlist> {
  const res = await fetch(`/api/watchlists/${id}/symbols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, exchange }),
  });
  if (!res.ok) throw new Error('Failed to add symbol');
  const data = await res.json();
  return data.watchlist;
}

async function removeSymbol(id: string, symbol: string, exchange: string): Promise<Watchlist> {
  const res = await fetch(`/api/watchlists/${id}/symbols`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, exchange }),
  });
  if (!res.ok) throw new Error('Failed to remove symbol');
  const data = await res.json();
  return data.watchlist;
}

async function analyzeWatchlist(
  id: string,
  timeframe: string,
  strategies: string[]
): Promise<WatchlistAnalysisResult> {
  const params = new URLSearchParams({
    timeframe,
    strategies: strategies.join(','),
  });
  const res = await fetch(`/api/watchlists/${id}/analyze?${params.toString()}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Analysis failed');
  }
  const data = await res.json();
  return data.result;
}

// ============ Create Watchlist Modal ============

function CreateWatchlistModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Create Watchlist</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Swing Watchlist"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="NIFTY 50 swing candidates"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || submitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Add Symbol Modal ============

function AddSymbolModal({
  open,
  onClose,
  onAdd,
  watchlistName,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (symbol: string, exchange: string) => Promise<unknown>;
  watchlistName: string;
}) {
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!symbol.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(symbol.trim().toUpperCase(), exchange);
      setSymbol('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add Symbol to {watchlistName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="RELIANCE.NS"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Exchange</label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
              <option value="NASDAQ">NASDAQ</option>
              <option value="NYSE">NYSE</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!symbol.trim() || submitting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Watchlist Table ============

function WatchlistCard({
  watchlist,
  analysis,
  analyzing,
  onAnalyze,
  onAddSymbol,
  onRemoveSymbol,
  onDelete,
}: {
  watchlist: Watchlist;
  analysis: WatchlistAnalysisResult | null;
  analyzing: boolean;
  onAnalyze: () => void;
  onAddSymbol: () => void;
  onRemoveSymbol: (symbol: string, exchange: string) => void;
  onDelete: () => void;
}) {
  const analysisMap = new Map(analysis?.symbols.map((s) => [s.symbol, s]) ?? []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold text-slate-900">{watchlist.name}</h3>
            {watchlist.isDefault && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Star className="w-3 h-3" /> Default
              </span>
            )}
          </div>
          {watchlist.description && (
            <p className="mt-1 text-sm text-slate-500">{watchlist.description}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">{watchlist.symbols.length} symbols</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onAnalyze}
            disabled={analyzing || watchlist.symbols.length === 0}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LineChart className="w-4 h-4" />
            )}
            Analyze
          </button>
          <button
            onClick={onAddSymbol}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          {!watchlist.isDefault && (
            <button
              onClick={onDelete}
              className="rounded-lg border border-slate-300 p-2 text-slate-400 hover:border-red-300 hover:text-red-500"
              aria-label="Delete watchlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {watchlist.symbols.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
          <Search className="w-8 h-8" />
          <p className="text-sm">No symbols yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Symbol</th>
                <th className="px-5 py-3 font-medium">Trend</th>
                <th className="px-5 py-3 font-medium">Setup</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Entry</th>
                <th className="px-5 py-3 font-medium">SL</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">R:R</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {watchlist.symbols.map((sym) => {
                const a = analysisMap.get(sym.symbol);
                return (
                  <tr key={`${sym.symbol}-${sym.exchange}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{sym.symbol}</div>
                      <div className="text-xs text-slate-400">{sym.exchange}</div>
                    </td>
                    <td className="px-5 py-3">
                      {a ? (
                        <span className="flex items-center gap-1.5">
                          {trendIcon(a.trend)}
                          <span className="text-xs text-slate-500">{a.trend}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {a?.setupType ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {a.setupType.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">No setup</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {a?.grade ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            GRADE_COLORS[a.grade] ?? 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {a.score}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {a?.entry ? a.entry.toFixed(2) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {a?.stopLoss ? a.stopLoss.toFixed(2) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {a?.target ? a.target.toFixed(2) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {a?.riskReward ? `${a.riskReward.toFixed(1)}:1` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onRemoveSymbol(sym.symbol, sym.exchange)}
                        className="rounded p-1 text-slate-300 hover:text-red-500"
                        aria-label={`Remove ${sym.symbol}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {analysis?.summary && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{analysis.summary.withSetups}</span> of{' '}
          <span className="font-medium text-slate-700">{analysis.summary.totalSymbols}</span>{' '}
          symbols have setups · Avg score{' '}
          <span className="font-medium text-slate-700">{analysis.summary.avgScore}</span>
          {analysis.summary.topSetup && (
            <>
              {' '}
              · Top:{' '}
              <span className="font-medium text-indigo-600">
                {analysis.summary.topSetup.symbol}
              </span>{' '}
              ({analysis.summary.topSetup.score})
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Page ============

const TIMEFRAMES = ['1d', '4h', '1h'] as const;
const STRATEGIES = ['BREAKOUT', 'PULLBACK', 'SUPPORT_BOUNCE', 'REVERSAL'] as const;

export default function WatchlistsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [addToId, setAddToId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<string>('4h');
  const [strategies, setStrategies] = useState<string[]>([...STRATEGIES]);
  const [analyses, setAnalyses] = useState<Record<string, WatchlistAnalysisResult>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const {
    data: watchlists = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['watchlists'],
    queryFn: fetchWatchlists,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string | undefined }) =>
      createWatchlist(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  const addMutation = useMutation({
    mutationFn: ({ id, symbol, exchange }: { id: string; symbol: string; exchange: string }) =>
      addSymbol(id, symbol, exchange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, symbol, exchange }: { id: string; symbol: string; exchange: string }) =>
      removeSymbol(id, symbol, exchange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  const handleAnalyze = useCallback(
    async (id: string) => {
      setAnalyzingIds((prev) => new Set(prev).add(id));
      try {
        const result = await analyzeWatchlist(id, timeframe, strategies);
        setAnalyses((prev) => ({ ...prev, [id]: result }));
      } catch (err) {
        console.error('Analysis error:', err);
        alert(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setAnalyzingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [timeframe, strategies]
  );

  const toggleStrategy = (s: string) => {
    setStrategies((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (isError) {
    return <div className="py-20 text-center text-red-500">Failed to load watchlists.</div>;
  }

  const addToWatchlist = watchlists.find((w) => w.id === addToId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Watchlists</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create watchlists, add symbols, and analyze swing-trading setups.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          New Watchlist
        </button>
      </div>

      {/* Scan config */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Timeframe:</span>
          <div className="flex gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  timeframe === tf
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Strategies:</span>
          {STRATEGIES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStrategy(s)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                strategies.includes(s)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              )}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist cards */}
      <div className="space-y-6">
        {watchlists.map((wl) => (
          <WatchlistCard
            key={wl.id}
            watchlist={wl}
            analysis={analyses[wl.id] ?? null}
            analyzing={analyzingIds.has(wl.id)}
            onAnalyze={() => handleAnalyze(wl.id)}
            onAddSymbol={() => setAddToId(wl.id)}
            onRemoveSymbol={(symbol, exchange) =>
              removeMutation.mutate({ id: wl.id, symbol, exchange })
            }
            onDelete={() => {
              if (confirm(`Delete "${wl.name}"?`)) {
                deleteMutation.mutate(wl.id);
              }
            }}
          />
        ))}
      </div>

      <CreateWatchlistModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(name, description) => createMutation.mutateAsync({ name, description })}
      />

      {addToWatchlist && (
        <AddSymbolModal
          open={addToId !== null}
          onClose={() => setAddToId(null)}
          watchlistName={addToWatchlist.name}
          onAdd={(symbol, exchange) =>
            addMutation.mutateAsync({ id: addToWatchlist.id, symbol, exchange })
          }
        />
      )}
    </div>
  );
}
