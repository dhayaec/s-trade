/**
 * Symbol Header Component
 * Displays symbol, price, change, exchange, market regime badge
 */

'use client';

import { TrendingUp, TrendingDown, Minus, ExternalLink, Search } from 'lucide-react';
import { useAnalysisStore } from '@/lib/stores/analysis-store';

interface MarketRegime {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  volatility: 'HIGH' | 'NORMAL' | 'LOW';
  breadth: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
}

function getRegimeBadge(regime: MarketRegime | null) {
  if (!regime) return null;

  const trendColors = {
    BULLISH: 'bg-positive-background text-positive-primary border-positive-border',
    BEARISH: 'bg-negative-background text-negative-primary border-negative-border',
    NEUTRAL: 'bg-warning-background text-warning-primary border-warning-border',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-medium">
      <span className={`px-2 py-0.5 rounded ${trendColors[regime.trend]}`}>
        {regime.trend === 'BULLISH' && <TrendingUp className="w-3 h-3 inline" />}
        {regime.trend === 'BEARISH' && <TrendingDown className="w-3 h-3 inline" />}
        {regime.trend === 'NEUTRAL' && <Minus className="w-3 h-3 inline" />} {regime.trend}
      </span>
      <span className="text-secondary hidden sm:inline-flex items-center gap-1">
        Mom: {regime.momentum}
      </span>
      <span className="text-secondary hidden md:inline-flex items-center gap-1">
        Vol: {regime.volatility}
      </span>
    </div>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatChange(
  change: number,
  changePercent: number
): { color: string; icon: React.ReactNode; text: string } {
  if (change > 0) {
    return {
      color: 'text-positive-primary',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      text: `+${formatPrice(change)} (+${changePercent.toFixed(2)}%)`,
    };
  } else if (change < 0) {
    return {
      color: 'text-negative-primary',
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      text: `${formatPrice(change)} (${changePercent.toFixed(2)}%)`,
    };
  }
  return {
    color: 'text-secondary',
    icon: <Minus className="w-3.5 h-3.5" />,
    text: `${formatPrice(change)} (${changePercent.toFixed(2)}%)`,
  };
}

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  close?: number;
  lastPrice?: number;
}

export function SymbolHeader({
  marketData,
  marketRegime,
}: {
  marketData: QuoteData | null;
  marketRegime: MarketRegime | null;
}) {
  const { symbol, exchange, timeframe: _timeframe } = useAnalysisStore();

  if (!symbol || !marketData) {
    return (
      <div className="flex items-center justify-between h-16 px-4 border-b border-primary">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-secondary" />
          <span className="text-secondary">Search for a symbol to analyze</span>
        </div>
        {marketRegime && getRegimeBadge(marketRegime)}
      </div>
    );
  }

  const price = marketData.close || marketData.lastPrice || 0;
  const change = marketData.change || 0;
  const changePercent = marketData.changePercent || 0;
  const { color, icon, text } = formatChange(change, changePercent);

  return (
    <div className="flex items-center justify-between h-16 px-4 border-b border-primary bg-secondary/50">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary tabular-nums font-mono">{symbol}</span>
          {exchange && (
            <span className="px-2 py-0.5 text-xs font-medium bg-tertiary text-secondary rounded">
              {exchange}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="tabular-nums font-mono text-xl font-bold text-primary">
              {formatPrice(price)}
            </div>
            <div className={`${color} text-sm flex items-center gap-1`}>
              {icon}
              {text}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1 px-3 py-1 bg-tertiary rounded border border-primary">
            <TimeframeTabs />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {marketRegime && getRegimeBadge(marketRegime)}
        <button
          className="p-2 text-secondary hover:text-primary transition-colors rounded"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TimeframeTabs() {
  const { timeframe, setTimeframe } = useAnalysisStore();
  const TIMEFRAMES: ('1D' | '4H' | '1H' | '30M')[] = ['1D', '4H', '1H', '30M'];

  return (
    <div className="flex items-center gap-1" role="tablist" aria-label="Chart timeframe">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          role="tab"
          aria-selected={timeframe === tf}
          onClick={() => setTimeframe(tf)}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
            timeframe === tf ? 'bg-primary text-info-primary' : 'text-secondary hover:text-primary'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

export default SymbolHeader;
