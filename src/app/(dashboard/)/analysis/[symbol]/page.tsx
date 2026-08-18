/**
 * Stock Analysis Screen - The Flagship Page
 * Desktop layout: Sidebar | Chart (70%) + Setup Details (30%)
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  BarChart3,
  List,
  TrendingUp,
  History,
  Settings,
} from 'lucide-react';
import { TradingChart } from '@/components/analysis/TradingChart';
import { SetupCard } from '@/components/analysis/SetupCard';
import { ConfidenceBreakdown } from '@/components/analysis/ConfidenceBreakdown';
import { SymbolHeader } from '@/components/analysis/SymbolHeader';
import { ChartLayerToggle } from '@/components/analysis/ChartLayerToggle';
import { TimeframeTabs } from '@/components/analysis/TimeframeTabs';
import { MarketRegimeBadge } from '@/components/analysis/MarketRegimeBadge';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import type { MarketDataPoint } from '@/types/market-data';

interface MarketRegimeData {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  volatility: 'HIGH' | 'NORMAL' | 'LOW';
  breadth: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
  nifty?: { price: number; change: number; changePercent: number };
  bankNifty?: { price: number; change: number; changePercent: number };
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/scanner', label: 'Scanner', icon: Search },
  { href: '/watchlist', label: 'Watchlist', icon: List },
  { href: '/analysis', label: 'Analysis', icon: TrendingUp },
  { href: '/backtest', label: 'Backtest', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AnalysisPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbol = params['symbol'] as string;
  const exchange = searchParams.get('exchange') || 'NSE';

  const { setSymbol, setAnalysisData, setLoading, setError, error, timeframe } = useAnalysisStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [marketRegime, setMarketRegime] = useState<MarketRegimeData | null>(null);
  const [marketData, setMarketData] = useState<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    close?: number;
    lastPrice?: number;
  } | null>(null);
  const [historicalData, setHistoricalData] = useState<MarketDataPoint[]>([]);

  const fetchMarketRegime = useCallback(async () => {
    try {
      const res = await fetch('/api/market-regime');
      const data = await res.json();
      if (data.data) setMarketRegime(data.data);
    } catch (err) {
      console.error('Failed to fetch market regime:', err);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    // Convert store timeframe (1D, 4H, 1H, 30M) to API timeframe (1d, 4h, 1h, 30m)
    const apiTimeframe = timeframe.toLowerCase() as '1d' | '4h' | '1h' | '30m';

    try {
      // Fetch historical market data for chart
      const marketRes = await fetch(
        `/api/market-data?symbol=${symbol}&exchange=${exchange}&timeframe=${apiTimeframe}&limit=300`
      );
      const marketDataResult = await marketRes.json();
      if (marketDataResult.data) {
        setHistoricalData(marketDataResult.data);
        if (marketDataResult.quote) setMarketData(marketDataResult.quote);
      }

      // Fetch analysis
      const analysisRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, exchange, timeframe: apiTimeframe }),
      });
      const analysisData = await analysisRes.json();

      if (analysisData.success) {
        setAnalysisData({
          setup: analysisData.setup,
          scoreBreakdown: analysisData.scoreBreakdown,
          analysisContext: analysisData.context,
          marketData: marketDataResult.quote || null,
        });
      } else {
        setError(analysisData.error || 'Analysis failed');
        setAnalysisData({
          setup: null,
          scoreBreakdown: null,
          analysisContext: null,
          marketData: marketDataResult.quote || null,
        });
      }
    } catch (err) {
      setError('Failed to fetch analysis');
      console.error('Analysis error:', err);
    }
  }, [symbol, exchange, timeframe, setLoading, setError, setAnalysisData]);

  // Initialize symbol on mount
  useEffect(() => {
    if (symbol) {
      setSymbol(symbol, exchange);
      // Defer fetch calls to avoid synchronous state updates in effect
      Promise.resolve().then(() => {
        fetchAnalysis();
        fetchMarketRegime();
      });
    }
  }, [symbol, exchange, setSymbol, fetchAnalysis, fetchMarketRegime]);

  if (!symbol) {
    return (
      <div className="min-h-screen bg-primary flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Search className="w-16 h-16 text-secondary mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-primary mb-2">Select a Symbol</h1>
            <p className="text-secondary">
              Use the global search (Cmd+K) or navigate from Scanner/Watchlist
            </p>
          </div>
        </main>
      </div>
    );
  }

  const currentSetup = useAnalysisStore.getState().setup;
  const currentScoreBreakdown = useAnalysisStore.getState().scoreBreakdown;
  const currentContext = useAnalysisStore.getState().analysisContext;

  return (
    <div className="min-h-screen bg-primary flex">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay-medium lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-50 h-full lg:h-auto w-64 bg-secondary border-r border-primary transition-transform duration-300 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar onToggle={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-secondary/95 backdrop-blur-sm border-b border-primary">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-secondary hover:text-primary rounded"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 text-secondary hover:text-primary rounded"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>

              {/* Global Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                <input
                  type="text"
                  placeholder="Search symbol... (Cmd+K)"
                  className="w-full pl-10 pr-4 py-2 bg-primary border border-primary rounded text-primary text-sm placeholder:text-muted focus:border-focus focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Market Regime - compact */}
              {marketRegime && <MarketRegimeBadge regime={marketRegime} variant="compact" />}

              {/* Symbol Header */}
              <SymbolHeader marketData={marketData} marketRegime={marketRegime} />
            </div>
          </div>
        </header>

        {/* Analysis Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {error && (
            <div className="mb-4 p-4 bg-negative-background border border-negative-border rounded text-negative-primary text-sm">
              {error}
              <button
                onClick={fetchAnalysis}
                className="ml-2 text-xs underline hover:text-negative-text"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Left Column - Chart (70%) */}
            <div className="space-y-4">
              {/* Chart Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TimeframeTabs />
                </div>
                <div className="flex items-center gap-2">
                  <ChartLayerToggle />
                </div>
              </div>

              {/* Chart */}
              <div className="bg-primary rounded-lg border border-primary overflow-hidden">
                <TradingChart
                  marketData={historicalData}
                  setup={currentSetup}
                  analysisContext={currentContext}
                  height={550}
                />
              </div>

              {/* Market Regime Full - below chart */}
              {marketRegime && <MarketRegimeBadge regime={marketRegime} variant="full" />}
            </div>

            {/* Right Column - Setup Details (30%) */}
            <div className="space-y-4 lg:sticky lg:top-20">
              {/* Setup Card */}
              <SetupCard
                setup={currentSetup}
                scoreBreakdown={currentScoreBreakdown}
                variant="full"
                showPositionCalculator={true}
                onAddToWatchlist={() => {
                  // TODO: Add to watchlist
                }}
              />

              {/* Confidence Breakdown */}
              <ConfidenceBreakdown
                scoreBreakdown={currentScoreBreakdown}
                setup={currentSetup}
                analysisContext={currentContext}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ onToggle }: { onToggle?: () => void }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="h-full flex flex-col bg-secondary border-r border-primary">
      {/* Logo */}
      <div className="p-4 border-b border-primary">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-info-primary rounded flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-inverse" />
          </div>
          <span className="font-bold text-lg text-primary">S-TRADE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 p-3 space-y-1 overflow-y-auto"
        role="navigation"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/analysis' && pathname.startsWith(item.href));
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-info-background text-info-primary'
                  : 'text-secondary hover:text-primary hover:bg-tertiary'
              }`}
              onClick={onToggle}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-primary">
        <div className="text-xs text-muted text-center">v1.0.0</div>
      </div>
    </div>
  );
}
