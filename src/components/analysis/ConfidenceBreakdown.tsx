/**
 * Confidence & Explanation Component
 * Shows 7-factor score breakdown with bars + "Why this setup?" / "What could invalidate?" lists
 */

'use client';

import {
  Check,
  AlertTriangle,
  Info,
  TrendingUp,
  BarChart3,
  Shield,
  CandlestickChart,
  Volume2,
  Zap,
  Layers,
} from 'lucide-react';
import type { ScoreBreakdown, TradingSetup } from '@/types';

interface FactorBarProps {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ReactNode;
  color: string;
}

function FactorBar({ label, score, maxScore, icon, color }: FactorBarProps) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const displayPct = Math.min(100, Math.max(0, pct));

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-secondary">{icon}</span>
          <span className="text-xs font-medium text-primary">{label}</span>
        </div>
        <div className="tabular-nums font-mono text-xs font-semibold" style={{ color }}>
          {score}/{maxScore}
        </div>
      </div>
      <div className="h-2 bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${displayPct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

interface ConfirmationItem {
  text: string;
  positive: boolean;
  icon?: React.ReactNode;
}

interface PatternSetup {
  direction: 'BULLISH' | 'BEARISH';
  type: string;
  totalScore: number;
}

interface AnalysisContext {
  indicators?: {
    higher?: { ema?: { ema20: number; ema50: number; ema200: number } };
    setup?: {
      ema?: { ema20: number; ema50: number };
      volume?: { relativeVolume: number };
      rsi?: { rsi: number };
    };
  };
  priceAction?: {
    setup?: { structure?: { type: string }; resistanceZones?: Array<{ center: number }> };
  };
  patterns?: {
    setup?: Array<{
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      type: string;
      totalScore: number;
    }>;
  };
  cpr?: { setup?: { position: 'ABOVE' | 'BELOW' | 'INSIDE' | 'AT_BC' | 'AT_TC' } | null };
}

interface ConfidenceBreakdownProps {
  scoreBreakdown: ScoreBreakdown | null;
  setup: TradingSetup | null;
  analysisContext?: AnalysisContext | null;
}

function generateConfirmations(
  setup: TradingSetup | null,
  context: AnalysisContext | null | undefined
): ConfirmationItem[] {
  if (!setup || !context) return [];

  const confirmations: ConfirmationItem[] = [];
  const direction = setup.direction;

  // Trend
  try {
    const htfEma = context.indicators?.higher?.ema;
    if (htfEma && htfEma.ema20 > htfEma.ema50 && htfEma.ema50 > htfEma.ema200) {
      confirmations.push({
        text:
          direction === 'LONG'
            ? 'Higher timeframe trend bullish'
            : 'Higher timeframe trend bearish (favorable for short)',
        positive: direction === 'LONG',
        icon: <TrendingUp className="w-3 h-3" />,
      });
    }
  } catch {}

  // Price Action / Structure
  try {
    const structure = context.priceAction?.setup?.structure;
    if (structure) {
      if (structure.type === 'HH_HL' && direction === 'LONG') {
        confirmations.push({
          text: 'Price structure: Higher High + Higher Low',
          positive: true,
          icon: <BarChart3 className="w-3 h-3" />,
        });
      } else if (structure.type === 'LH_LL' && direction === 'SHORT') {
        confirmations.push({
          text: 'Price structure: Lower High + Lower Low',
          positive: true,
          icon: <BarChart3 className="w-3 h-3" />,
        });
      }
    }
  } catch {}

  // Volume
  try {
    const relVol = context.indicators?.setup?.volume?.relativeVolume;
    if (relVol && relVol >= 1.5) {
      confirmations.push({
        text: `Volume ${relVol.toFixed(1)}× average`,
        positive: true,
        icon: <Volume2 className="w-3 h-3" />,
      });
    }
  } catch {}

  // Candlestick patterns
  try {
    const patterns = (context.patterns?.setup as PatternSetup[]) || [];
    const bullish = patterns.filter((p) => p.direction === 'BULLISH');
    const bearish = patterns.filter((p) => p.direction === 'BEARISH');
    if (direction === 'LONG' && bullish.length > 0) {
      const best = bullish.reduce((a, b) => (a.totalScore > b.totalScore ? a : b));
      if (best.totalScore >= 50) {
        confirmations.push({
          text: `${best.type} candlestick confirmation`,
          positive: true,
          icon: <CandlestickChart className="w-3 h-3" />,
        });
      }
    } else if (direction === 'SHORT' && bearish.length > 0) {
      const best = bearish.reduce((a, b) => (a.totalScore > b.totalScore ? a : b));
      if (best.totalScore >= 50) {
        confirmations.push({
          text: `${best.type} candlestick confirmation`,
          positive: true,
          icon: <CandlestickChart className="w-3 h-3" />,
        });
      }
    }
  } catch {}

  // Momentum
  try {
    const rsi = context.indicators?.setup?.rsi?.rsi;
    if (rsi && rsi >= 50 && rsi <= 70) {
      confirmations.push({
        text: `RSI ${rsi.toFixed(1)} — healthy momentum`,
        positive: true,
        icon: <Zap className="w-3 h-3" />,
      });
    }
  } catch {}

  // EMA positioning
  try {
    const setupEma = context.indicators?.setup?.ema;
    if (setupEma && setupEma.ema20 > setupEma.ema50) {
      confirmations.push({
        text: direction === 'LONG' ? 'Price above 20 EMA / 50 EMA' : 'Price below 20 EMA / 50 EMA',
        positive: true,
        icon: <Layers className="w-3 h-3" />,
      });
    }
  } catch {}

  // CPR
  try {
    const cpr = context.cpr?.setup;
    if (cpr && cpr.position === 'ABOVE' && direction === 'LONG') {
      confirmations.push({
        text: 'Price above CPR — bullish alignment',
        positive: true,
        icon: <Shield className="w-3 h-3" />,
      });
    }
  } catch {}

  return confirmations;
}

function generateWarnings(
  setup: TradingSetup | null,
  context: AnalysisContext | null | undefined
): ConfirmationItem[] {
  if (!setup) return [];

  const warnings: ConfirmationItem[] = [];
  const entry = setup.entry;
  const stopLoss = setup.stopLoss;

  warnings.push({
    text: `Close back below ₹${stopLoss.toFixed(2)} invalidates setup`,
    positive: false,
    icon: <AlertTriangle className="w-3 h-3" />,
  });

  try {
    const nearestResistance = context?.priceAction?.setup?.resistanceZones?.[0];
    if (nearestResistance && nearestResistance.center < entry * 1.05) {
      warnings.push({
        text: `Near resistance at ₹${nearestResistance.center.toFixed(2)}`,
        positive: false,
        icon: <AlertTriangle className="w-3 h-3" />,
      });
    }
  } catch {}

  try {
    const relVol = context?.indicators?.setup?.volume?.relativeVolume;
    if (relVol && relVol < 1.0) {
      warnings.push({
        text: 'Below average volume — weak participation',
        positive: false,
        icon: <Volume2 className="w-3 h-3" />,
      });
    }
  } catch {}

  return warnings;
}

export function ConfidenceBreakdown({
  scoreBreakdown,
  setup,
  analysisContext,
}: ConfidenceBreakdownProps) {
  if (!scoreBreakdown) {
    return (
      <div className="bg-secondary border border-primary rounded-lg p-5">
        <div className="text-center text-secondary py-8">No scoring data available</div>
      </div>
    );
  }

  const factorData = [
    {
      key: 'trend',
      label: 'Trend',
      max: 20,
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      color: 'var(--color-chart-ema20)',
    },
    {
      key: 'priceAction',
      label: 'Price Action',
      max: 20,
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      color: 'var(--color-chart-ema50)',
    },
    {
      key: 'supportResistance',
      label: 'Support/Resistance',
      max: 15,
      icon: <Layers className="w-3.5 h-3.5" />,
      color: 'var(--color-positive-primary)',
    },
    {
      key: 'candlestick',
      label: 'Candlestick',
      max: 15,
      icon: <CandlestickChart className="w-3.5 h-3.5" />,
      color: 'var(--color-warning-primary)',
    },
    {
      key: 'volume',
      label: 'Volume',
      max: 10,
      icon: <Volume2 className="w-3.5 h-3.5" />,
      color: 'var(--color-info-primary)',
    },
    {
      key: 'momentum',
      label: 'Momentum',
      max: 10,
      icon: <Zap className="w-3.5 h-3.5" />,
      color: 'var(--color-chart-ema100)',
    },
    {
      key: 'cpr',
      label: 'CPR',
      max: 5,
      icon: <Shield className="w-3.5 h-3.5" />,
      color: 'var(--color-chart-ema200)',
    },
    {
      key: 'riskReward',
      label: 'Risk/Reward',
      max: 5,
      icon: <Info className="w-3.5 h-3.5" />,
      color: 'var(--color-positive-secondary)',
    },
  ] as const;

  const confirmations = generateConfirmations(setup, analysisContext);
  const warnings = generateWarnings(setup, analysisContext);

  return (
    <div className="space-y-5">
      {/* Score Breakdown */}
      <div className="bg-secondary border border-primary rounded-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-primary">Setup Score Breakdown</h3>
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-mono text-2xl font-bold text-primary">
              {scoreBreakdown.total}
            </span>
            <span className="text-xs text-secondary">/100</span>
          </div>
        </div>
        {factorData.map((factor) => (
          <FactorBar
            key={factor.key}
            label={factor.label}
            score={scoreBreakdown[factor.key as keyof ScoreBreakdown] as number}
            maxScore={factor.max}
            icon={factor.icon}
            color={factor.color}
          />
        ))}
      </div>

      {/* Why this setup */}
      <div className="bg-secondary border border-primary rounded-lg p-5">
        <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <Check className="w-4 h-4 text-positive-primary" />
          Why this setup?
        </h3>
        {confirmations.length > 0 ? (
          <div className="space-y-2.5">
            {confirmations.map((c) => (
              <div
                key={`confirm-${c.text}`}
                className="flex items-start gap-3 p-3 bg-tertiary rounded"
              >
                <span className="text-positive-primary mt-0.5 shrink-0">
                  {c.icon || <Check className="w-3 h-3" />}
                </span>
                <span className="text-xs text-primary leading-relaxed">{c.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-secondary py-4 text-center">No confirmations detected</div>
        )}
      </div>

      {/* What could invalidate */}
      <div className="bg-secondary border border-primary rounded-lg p-5">
        <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-primary" />
          What could invalidate?
        </h3>
        {warnings.length > 0 ? (
          <div className="space-y-2.5">
            {warnings.map((w) => (
              <div
                key={`warn-${w.text}`}
                className="flex items-start gap-3 p-3 bg-tertiary rounded border border-warning-border/30"
              >
                <span className="text-warning-primary mt-0.5 shrink-0">
                  {w.icon || <AlertTriangle className="w-3 h-3" />}
                </span>
                <span className="text-xs text-primary leading-relaxed">{w.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-secondary py-4 text-center">No warnings detected</div>
        )}
      </div>
    </div>
  );
}

export default ConfidenceBreakdown;
