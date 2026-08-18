/**
 * Setup Card Component
 * Reusable across Scanner, Watchlist, and Analysis screens
 * Displays: Direction, Setup Type, Confidence, Entry/SL/Targets, R:R, Position Size Calculator
 */

'use client';

import { useState } from 'react';
import {
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calculator,
  Plus,
  Copy,
} from 'lucide-react';
import type { TradingSetup, ScoreBreakdown } from '@/types';

interface SetupCardProps {
  setup: TradingSetup | null;
  scoreBreakdown: ScoreBreakdown | null;
  variant?: 'full' | 'compact' | 'minimal';
  showPositionCalculator?: boolean;
  onAddToWatchlist?: () => void;
  className?: string;
}

interface PositionCalculation {
  maxRisk: number;
  suggestedQuantity: number;
  riskPerShare: number;
}

function calculatePositionSize(
  entry: number,
  stopLoss: number,
  capital: number,
  riskPercent: number
): PositionCalculation {
  const riskPerShare = Math.abs(entry - stopLoss);
  const maxRisk = capital * (riskPercent / 100);
  const suggestedQuantity = riskPerShare > 0 ? Math.floor(maxRisk / riskPerShare) : 0;

  return { maxRisk, suggestedQuantity, riskPerShare };
}

function getDirectionBadge(direction: 'LONG' | 'SHORT') {
  return direction === 'LONG' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-positive-background text-positive-primary border border-positive-border">
      <TrendingUp className="w-3 h-3" />
      LONG
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-negative-background text-negative-primary border border-negative-border">
      <TrendingDown className="w-3 h-3" />
      SHORT
    </span>
  );
}

function getGradeBadge(grade: string) {
  const gradeConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    EXCELLENT: {
      label: 'EXCELLENT',
      className: 'bg-positive-background text-positive-primary border-positive-border',
      icon: <Target className="w-3 h-3" />,
    },
    STRONG: {
      label: 'STRONG',
      className: 'bg-info-background text-info-primary border-info-border',
      icon: <TrendingUp className="w-3 h-3" />,
    },
    MODERATE: {
      label: 'MODERATE',
      className: 'bg-warning-background text-warning-primary border-warning-border',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    WEAK: {
      label: 'WEAK',
      className: 'bg-negative-background text-negative-primary border-negative-border',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    REJECT: {
      label: 'REJECT',
      className: 'bg-muted-background text-muted-primary border-muted-border',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };

  const config = gradeConfig[grade as keyof typeof gradeConfig] ?? gradeConfig['REJECT'];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function SetupCard({
  setup,
  scoreBreakdown,
  variant = 'full',
  showPositionCalculator = true,
  onAddToWatchlist,
  className = '',
}: SetupCardProps) {
  const [capital, setCapital] = useState(100000);
  const [riskPercent, setRiskPercent] = useState(1);

  if (!setup) {
    return (
      <div className={`bg-secondary border border-primary rounded-lg p-4 ${className}`}>
        <div className="text-center text-secondary py-8">No setup detected</div>
      </div>
    );
  }

  const direction = setup.direction;
  const entry = setup.entry;
  const stopLoss = setup.stopLoss;
  const target1 = setup.targets?.[0] ?? 0;
  const target2 = setup.targets?.[1] ?? 0;
  const riskReward = setup.riskReward;
  const risk = Math.abs(entry - stopLoss);
  const reward1 = Math.abs(target1 - entry);
  const reward2 = Math.abs(target2 - entry);

  const positionCalc = calculatePositionSize(entry, stopLoss, capital, riskPercent);

  const grade =
    scoreBreakdown?.total !== undefined
      ? scoreBreakdown.total >= 80
        ? 'EXCELLENT'
        : scoreBreakdown.total >= 70
          ? 'STRONG'
          : scoreBreakdown.total >= 60
            ? 'MODERATE'
            : scoreBreakdown.total >= 50
              ? 'WEAK'
              : 'REJECT'
      : 'REJECT';
  const totalScore = scoreBreakdown?.total || 0;

  if (variant === 'minimal') {
    return (
      <div className={`bg-secondary border border-primary rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {getDirectionBadge(direction)}
            <span className="text-sm font-medium text-primary">{setup.setupType}</span>
          </div>
          <div className="flex items-center gap-2">
            {getGradeBadge(grade)}
            <span className="tabular-nums font-mono text-sm font-semibold text-primary">
              {totalScore}/100
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-secondary border border-primary rounded-lg p-4 ${className}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {getDirectionBadge(direction)}
              <span className="text-sm font-medium text-primary">{setup.setupType}</span>
            </div>
            <div className="flex items-center gap-2">
              {getGradeBadge(grade)}
              <span className="tabular-nums font-mono text-sm font-semibold text-primary">
                {totalScore}/100
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="tabular-nums font-mono text-lg font-bold text-primary">
              {formatPrice(entry)}
            </div>
            <div className="text-xs text-secondary">Entry</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-tertiary rounded p-3">
            <div className="text-xs text-secondary">Stop Loss</div>
            <div className="tabular-nums font-mono text-sm font-semibold text-negative-primary">
              {formatPrice(stopLoss)}
            </div>
            <div className="text-xs text-negative-primary">-{formatPrice(risk)}</div>
          </div>
          <div className="bg-tertiary rounded p-3">
            <div className="text-xs text-secondary">Target 1</div>
            <div className="tabular-nums font-mono text-sm font-semibold text-positive-primary">
              {formatPrice(target1)}
            </div>
            <div className="text-xs text-positive-primary">+{formatPrice(reward1)}</div>
          </div>
          <div className="bg-tertiary rounded p-3">
            <div className="text-xs text-secondary">Target 2</div>
            <div className="tabular-nums font-mono text-sm font-semibold text-positive-primary">
              {formatPrice(target2)}
            </div>
            <div className="text-xs text-positive-primary">+{formatPrice(reward2)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-primary">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-secondary" />
            <span className="text-sm text-secondary">R:R</span>
            <span className="tabular-nums font-mono text-lg font-bold text-info-primary">
              {riskReward.toFixed(2)}
            </span>
          </div>
          {onAddToWatchlist && (
            <button
              onClick={onAddToWatchlist}
              className="px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors border border-primary hover:border-secondary rounded"
            >
              + Watchlist
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-secondary border border-primary rounded-lg p-5 ${className}`}>
      {/* Header: Direction + Setup Type + Grade */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          {getDirectionBadge(direction)}
          <div>
            <div className="text-lg font-semibold text-primary">{setup.setupType}</div>
            <div className="text-xs text-secondary capitalize">
              {setup.setupType.toLowerCase()} setup detected
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getGradeBadge(grade)}
          <div className="tabular-nums font-mono text-2xl font-bold text-primary">{totalScore}</div>
          <div className="text-xs text-secondary">/100</div>
        </div>
      </div>

      {/* Entry, SL, Targets Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-tertiary rounded p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-secondary">Entry Price</span>
            <span className="text-xs text-info-primary">Market</span>
          </div>
          <div className="tabular-nums font-mono text-2xl font-bold text-primary">
            {formatPrice(entry)}
          </div>
        </div>

        <div className="bg-tertiary rounded p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-secondary">Stop Loss</span>
            <span className="text-xs text-negative-primary">Risk: {formatPrice(risk)}</span>
          </div>
          <div className="tabular-nums font-mono text-2xl font-bold text-negative-primary">
            {formatPrice(stopLoss)}
          </div>
        </div>

        <div className="bg-tertiary rounded p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-secondary">Target 1</span>
            <span className="text-xs text-positive-primary">Reward: {formatPrice(reward1)}</span>
          </div>
          <div className="tabular-nums font-mono text-2xl font-bold text-positive-primary">
            {formatPrice(target1)}
          </div>
        </div>

        <div className="bg-tertiary rounded p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-secondary">Target 2</span>
            <span className="text-xs text-positive-primary">Reward: {formatPrice(reward2)}</span>
          </div>
          <div className="tabular-nums font-mono text-2xl font-bold text-positive-primary">
            {formatPrice(target2)}
          </div>
        </div>
      </div>

      {/* Risk/Reward Summary */}
      <div className="bg-tertiary rounded p-4 mb-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="border-r border-primary">
            <div className="text-xs text-secondary">Risk</div>
            <div className="tabular-nums font-mono text-lg font-bold text-negative-primary">
              {formatPrice(risk)}
            </div>
            <div className="text-xs text-secondary">per share</div>
          </div>
          <div className="border-r border-primary">
            <div className="text-xs text-secondary">Reward (T1)</div>
            <div className="tabular-nums font-mono text-lg font-bold text-positive-primary">
              {formatPrice(reward1)}
            </div>
            <div className="text-xs text-secondary">per share</div>
          </div>
          <div>
            <div className="text-xs text-secondary">R:R Ratio</div>
            <div className="tabular-nums font-mono text-xl font-bold text-info-primary">
              {riskReward.toFixed(2)}
            </div>
            <div className="text-xs text-secondary">Risk:Reward</div>
          </div>
        </div>
      </div>

      {/* Position Size Calculator */}
      {showPositionCalculator && (
        <div className="bg-tertiary rounded p-4 mb-4 border border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary">Position Size Calculator</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-secondary mb-1">Capital (₹)</label>
              <div className="relative">
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-primary border border-primary rounded px-3 py-2 text-primary font-mono tabular-nums focus:border-focus focus:outline-none"
                  step="1000"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Risk per Trade (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={riskPercent}
                  onChange={(e) =>
                    setRiskPercent(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))
                  }
                  className="w-full bg-primary border border-primary rounded px-3 py-2 text-primary font-mono tabular-nums focus:border-focus focus:outline-none"
                  step="0.1"
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-primary rounded">
              <div className="text-xs text-secondary">Max Risk</div>
              <div className="tabular-nums font-mono text-lg font-bold text-warning-primary">
                ₹{formatNumber(positionCalc.maxRisk)}
              </div>
            </div>
            <div className="p-3 bg-primary rounded">
              <div className="text-xs text-secondary">Risk/Share</div>
              <div className="tabular-nums font-mono text-lg font-bold text-secondary">
                ₹{formatPrice(positionCalc.riskPerShare)}
              </div>
            </div>
            <div className="p-3 bg-primary rounded">
              <div className="text-xs text-secondary">Suggested Qty</div>
              <div className="tabular-nums font-mono text-xl font-bold text-info-primary">
                {formatNumber(positionCalc.suggestedQuantity)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {onAddToWatchlist && (
          <button
            onClick={onAddToWatchlist}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-info-background text-info-primary border border-info-border rounded hover:bg-info-border transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add to Watchlist
          </button>
        )}
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-tertiary text-primary border border-primary rounded hover:bg-hover transition-colors font-medium text-sm">
          <Copy className="w-4 h-4" />
          Copy Setup
        </button>
      </div>
    </div>
  );
}

export default SetupCard;
