/**
 * Market Regime Badge Component
 * Displays market regime with trend, momentum, volatility, breadth
 */

'use client';

import { TrendingUp, TrendingDown, Minus, Zap, Activity, Users } from 'lucide-react';

interface MarketRegime {
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentum: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  volatility: 'HIGH' | 'NORMAL' | 'LOW';
  breadth: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
}

interface MarketRegimeBadgeProps {
  regime: MarketRegime | null;
  variant?: 'compact' | 'full';
}

function getTrendConfig(trend: MarketRegime['trend']) {
  const configs = {
    BULLISH: {
      label: 'BULLISH',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      bg: 'bg-positive-background',
      text: 'text-positive-primary',
      border: 'border-positive-border',
    },
    BEARISH: {
      label: 'BEARISH',
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      bg: 'bg-negative-background',
      text: 'text-negative-primary',
      border: 'border-negative-border',
    },
    NEUTRAL: {
      label: 'NEUTRAL',
      icon: <Minus className="w-3.5 h-3.5" />,
      bg: 'bg-warning-background',
      text: 'text-warning-primary',
      border: 'border-warning-border',
    },
  };
  return configs[trend];
}

export function MarketRegimeBadge({ regime, variant = 'compact' }: MarketRegimeBadgeProps) {
  if (!regime) return null;

  const trendConfig = getTrendConfig(regime.trend);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-tertiary rounded border border-primary">
        <span className="text-xs text-secondary">Market:</span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${trendConfig.bg} ${trendConfig.text} ${trendConfig.border}`}
        >
          {trendConfig.icon}
          {trendConfig.label}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-secondary border border-primary rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary">Market Regime</h3>
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded ${trendConfig.bg} ${trendConfig.text} ${trendConfig.border}`}
        >
          {trendConfig.icon}
          {trendConfig.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-tertiary rounded p-3">
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <Zap className="w-3.5 h-3.5" />
            Momentum
          </div>
          <div className="text-sm font-medium text-primary capitalize">
            {regime.momentum.toLowerCase()}
          </div>
        </div>

        <div className="bg-tertiary rounded p-3">
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <Activity className="w-3.5 h-3.5" />
            Volatility
          </div>
          <div className="text-sm font-medium text-primary">{regime.volatility}</div>
        </div>

        <div className="bg-tertiary rounded p-3">
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Trend
          </div>
          <div className="text-sm font-medium text-primary capitalize">
            {regime.trend.toLowerCase()}
          </div>
        </div>

        <div className="bg-tertiary rounded p-3">
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <Users className="w-3.5 h-3.5" />
            Breadth
          </div>
          <div className="text-sm font-medium text-primary capitalize">
            {regime.breadth.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Strategy Recommendations */}
      <div className="mt-4 pt-4 border-t border-primary">
        <div className="text-xs text-secondary mb-2">Best Strategies</div>
        <div className="flex flex-wrap gap-1.5">
          {regime.trend === 'BULLISH' && (
            <>
              <span className="px-2 py-1 text-xs bg-positive-background text-positive-primary rounded border border-positive-border">
                Breakout
              </span>
              <span className="px-2 py-1 text-xs bg-positive-background text-positive-primary rounded border border-positive-border">
                Pullback
              </span>
            </>
          )}
          {regime.trend === 'BEARISH' && (
            <>
              <span className="px-2 py-1 text-xs bg-negative-background text-negative-primary rounded border border-negative-border">
                Short Breakout
              </span>
              <span className="px-2 py-1 text-xs bg-negative-background text-negative-primary rounded border border-negative-border">
                Reversal
              </span>
            </>
          )}
          {regime.trend === 'NEUTRAL' && (
            <>
              <span className="px-2 py-1 text-xs bg-warning-background text-warning-primary rounded border border-warning-border">
                Support Bounce
              </span>
              <span className="px-2 py-1 text-xs bg-warning-background text-warning-primary rounded border border-warning-border">
                Range Trade
              </span>
            </>
          )}
        </div>

        {regime.volatility === 'HIGH' && (
          <div className="mt-2 text-xs text-warning-primary flex items-center gap-1">
            <Activity className="w-3 h-3" />
            High volatility — reduce position size
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketRegimeBadge;
