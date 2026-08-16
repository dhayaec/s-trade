/**
 * Symbol Search Page
 * Debounced search input with symbol results
 */
'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, CheckCircle, XCircle, Info } from 'lucide-react';

interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
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
  }, []);

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
                <button className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                  Analyze
                </button>
                <button className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">
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
    </div>
  );
}
