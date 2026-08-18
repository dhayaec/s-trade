/**
 * S-Trade Client State Store - Analysis Screen
 * Zustand store for analysis screen state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TradingSetup, ScoreBreakdown, AnalysisContext, ChartLayerState } from '@/types';

interface AnalysisState {
  // Current symbol being analyzed
  symbol: string | null;
  exchange: string | null;
  timeframe: '1D' | '4H' | '1H' | '30M';

  // Data
  setup: TradingSetup | null;
  scoreBreakdown: ScoreBreakdown | null;
  analysisContext: AnalysisContext | null;
  marketData: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    close?: number;
    lastPrice?: number;
  } | null;

  // Chart layers
  chartLayers: ChartLayerState;

  // UI state
  isLoading: boolean;
  error: string | null;
  selectedTab: 'chart' | 'setup' | 'confirmations' | 'risk';

  // Risk calculator
  capital: number;
  riskPercent: number;

  // Actions
  setSymbol: (symbol: string, exchange: string) => void;
  setTimeframe: (timeframe: '1D' | '4H' | '1H' | '30M') => void;
  setAnalysisData: (data: {
    setup: TradingSetup | null;
    scoreBreakdown: ScoreBreakdown | null;
    analysisContext: AnalysisContext | null;
    marketData: {
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      close?: number;
      lastPrice?: number;
    } | null;
  }) => void;
  setChartLayer: (layer: keyof ChartLayerState, enabled: boolean) => void;
  setChartLayers: (layers: Partial<ChartLayerState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedTab: (tab: AnalysisState['selectedTab']) => void;
  setRiskParams: (capital: number, riskPercent: number) => void;
  reset: () => void;
}

const defaultChartLayers: ChartLayerState = {
  priceAction: true,
  supportResistance: true,
  tradeSetup: true,
  candlestick: true,
  trend: true,
  volume: true,
  cpr: false,
  indicators: false,
};

const defaultState = {
  symbol: null,
  exchange: null,
  timeframe: '1D' as const,
  setup: null,
  scoreBreakdown: null,
  analysisContext: null,
  marketData: null as {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    close?: number;
    lastPrice?: number;
  } | null,
  chartLayers: defaultChartLayers,
  isLoading: false,
  error: null,
  selectedTab: 'chart' as const,
  capital: 100000,
  riskPercent: 1,
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      ...defaultState,

      setSymbol: (symbol: string, exchange: string) => {
        set({ symbol, exchange, error: null });
      },

      setTimeframe: (timeframe) => {
        set({ timeframe });
      },

      setAnalysisData: (data) => {
        set({
          setup: data.setup,
          scoreBreakdown: data.scoreBreakdown,
          analysisContext: data.analysisContext,
          marketData: data.marketData,
          isLoading: false,
          error: null,
        });
      },

      setChartLayer: (layer, enabled) => {
        set((state) => ({
          chartLayers: { ...state.chartLayers, [layer]: enabled },
        }));
      },

      setChartLayers: (layers) => {
        set((state) => ({
          chartLayers: { ...state.chartLayers, ...layers },
        }));
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      setSelectedTab: (selectedTab) => {
        set({ selectedTab });
      },

      setRiskParams: (capital, riskPercent) => {
        set({ capital, riskPercent });
      },

      reset: () => {
        set(defaultState);
      },
    }),
    {
      name: 's-trade-analysis-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chartLayers: state.chartLayers,
        timeframe: state.timeframe,
        capital: state.capital,
        riskPercent: state.riskPercent,
      }),
    }
  )
);

// Selectors for derived state
export const useChartLayers = () => useAnalysisStore((state) => state.chartLayers);
export const useSetChartLayer = () => useAnalysisStore((state) => state.setChartLayer);
export const useSetChartLayers = () => useAnalysisStore((state) => state.setChartLayers);
// Chart layers combined selector for use in components
export const useChart = () => {
  const chartLayers = useChartLayers();
  const setChartLayer = useSetChartLayer();
  const setChartLayers = useSetChartLayers();
  return { chartLayers, setChartLayer, setChartLayers };
};
export const useCurrentSymbol = () =>
  useAnalysisStore((state) => ({
    symbol: state.symbol,
    exchange: state.exchange,
    timeframe: state.timeframe,
  }));
export const useAnalysisData = () =>
  useAnalysisStore((state) => ({
    setup: state.setup,
    scoreBreakdown: state.scoreBreakdown,
    analysisContext: state.analysisContext,
    marketData: state.marketData,
  }));
export const useAnalysisUI = () =>
  useAnalysisStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
    selectedTab: state.selectedTab,
  }));
export const useRiskParams = () =>
  useAnalysisStore((state) => ({
    capital: state.capital,
    riskPercent: state.riskPercent,
  }));
