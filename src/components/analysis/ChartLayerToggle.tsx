/**
 * Chart Layer Toggle Component
 * Dropdown menu for toggling chart layers
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Check,
  X,
  Layers,
  TrendingUp,
  BarChart3,
  Target,
  CandlestickChart,
  Volume2,
  Shield,
  LayoutDashboard,
} from 'lucide-react';
import { useChartLayers, useSetChartLayer } from '@/lib/stores/analysis-store';
import type { ChartLayerState } from '@/types';

interface LayerConfig {
  key: keyof ChartLayerState;
  label: string;
  icon: React.ReactNode;
  description: string;
  default: boolean;
}

const LAYER_CONFIG: LayerConfig[] = [
  {
    key: 'priceAction',
    label: 'Price Action',
    icon: <BarChart3 className="w-4 h-4" />,
    description: 'Candlesticks and price movement',
    default: true,
  },
  {
    key: 'supportResistance',
    label: 'Support/Resistance',
    icon: <Layers className="w-4 h-4" />,
    description: 'Key S/R zones with strength',
    default: true,
  },
  {
    key: 'tradeSetup',
    label: 'Trade Setup',
    icon: <Target className="w-4 h-4" />,
    description: 'Entry, Stop Loss, Target lines',
    default: true,
  },
  {
    key: 'candlestick',
    label: 'Candlestick Patterns',
    icon: <CandlestickChart className="w-4 h-4" />,
    description: 'Pattern markers on chart',
    default: true,
  },
  {
    key: 'trend',
    label: 'Trend (EMAs)',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'EMA 20, EMA 50',
    default: true,
  },
  {
    key: 'volume',
    label: 'Volume',
    icon: <Volume2 className="w-4 h-4" />,
    description: 'Volume histogram',
    default: true,
  },
  {
    key: 'cpr',
    label: 'CPR',
    icon: <Shield className="w-4 h-4" />,
    description: 'Central Pivot Range',
    default: false,
  },
  {
    key: 'indicators',
    label: 'Indicators',
    icon: <LayoutDashboard className="w-4 h-4" />,
    description: 'RSI, MACD, ADX overlays',
    default: false,
  },
];

export function ChartLayerToggle() {
  const chartLayers = useChartLayers();
  const setChartLayer = useSetChartLayer();
  const [isOpen, setIsOpen] = useState(false);

  const toggleLayer = (key: keyof ChartLayerState) => {
    setChartLayer(key, !chartLayers[key]);
  };

  const toggleAll = (enabled: boolean) => {
    LAYER_CONFIG.forEach((layer) => {
      setChartLayer(layer.key, enabled);
    });
  };

  const enabledCount = LAYER_CONFIG.filter((l) => chartLayers[l.key]).length;
  const totalCount = LAYER_CONFIG.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-tertiary border border-primary rounded text-sm text-primary hover:bg-hover transition-colors"
        aria-label="Chart layers"
        aria-expanded={isOpen}
      >
        <Layers className="w-4 h-4" />
        <span>Layers</span>
        <span className="tabular-nums font-mono text-xs bg-primary px-1.5 py-0.5 rounded">
          {enabledCount}/{totalCount}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-secondary border border-primary rounded-lg shadow-xl overflow-hidden">
            <div className="p-3 border-b border-primary flex items-center justify-between">
              <h4 className="text-sm font-semibold text-primary">Chart Layers</h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleAll(true)}
                  className="text-xs text-secondary hover:text-primary px-2 py-1 rounded"
                  title="Enable all"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="text-xs text-secondary hover:text-primary px-2 py-1 rounded"
                  title="Disable all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
              {LAYER_CONFIG.map((layer) => {
                const isEnabled = chartLayers[layer.key];
                return (
                  <button
                    key={String(layer.key)}
                    onClick={() => toggleLayer(layer.key)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      isEnabled ? 'bg-tertiary' : 'bg-transparent hover:bg-tertiary/50'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                        isEnabled
                          ? 'bg-positive-background text-positive-primary'
                          : 'bg-primary text-secondary'
                      }`}
                    >
                      {layer.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium truncate ${isEnabled ? 'text-primary' : 'text-secondary'}`}
                        >
                          {layer.label}
                        </span>
                        {isEnabled && <Check className="w-4 h-4 text-positive-primary shrink-0" />}
                      </div>
                      <span className="text-xs text-muted truncate block">{layer.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChartLayerToggle;
