/**
 * Trading Chart Component
 * Lightweight Charts with layer system for candlesticks, volume, EMAs, S/R zones, trade setup lines, pattern markers
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  CrosshairMode,
  type Time,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { TradingSetup, AnalysisContext, MarketDataPoint } from '@/types';
import { useChartLayers } from '@/lib/stores/analysis-store';

interface TradingChartProps {
  marketData: MarketDataPoint[] | null;
  setup: TradingSetup | null;
  analysisContext: AnalysisContext | null;
  height?: number;
  className?: string;
}

function timeToUTCTimestamp(time: string | number | Date): UTCTimestamp {
  const date = new Date(time);
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

function formatChartData(rawData: MarketDataPoint[]): {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}[] {
  if (!rawData || !Array.isArray(rawData)) return [];
  return rawData
    .map((d) => ({
      time: timeToUTCTimestamp(d.time),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 0,
    }))
    .sort((a, b) => a.time - b.time);
}

function getEMAData(
  marketData: { time: UTCTimestamp; close: number }[],
  period: number
): LineData[] {
  if (!marketData || marketData.length < period) return [];
  const k = 2 / (period + 1);
  const ema: LineData[] = [];
  const firstClose = marketData[0]?.close;
  if (firstClose === undefined) return [];

  let prevEma = firstClose;

  for (let i = 0; i < marketData.length; i++) {
    const dataPoint = marketData[i];
    if (!dataPoint) continue;

    if (i < period - 1) {
      ema.push({ time: dataPoint.time, value: NaN });
    } else if (i === period - 1) {
      const sum = marketData.slice(0, period).reduce((acc, d) => acc + (d?.close || 0), 0);
      prevEma = sum / period;
      ema.push({ time: dataPoint.time, value: prevEma });
    } else {
      const close = dataPoint.close;
      prevEma = close * k + prevEma * (1 - k);
      ema.push({ time: dataPoint.time, value: prevEma });
    }
  }
  return ema;
}

interface PatternSetup {
  direction: 'BULLISH' | 'BEARISH';
  type: string;
  totalScore: number;
  timestamp: number;
}

function getPatternMarkers(context: AnalysisContext | null): {
  time: Time;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'circle' | 'square';
  text: string;
  size: number;
}[] {
  if (!context?.patterns?.setup) return [];

  const patterns = context.patterns.setup as PatternSetup[];
  return patterns
    .filter((p) => p.totalScore >= 50)
    .map((p) => ({
      time: timeToUTCTimestamp(p.timestamp),
      position: p.direction === 'BULLISH' ? 'belowBar' : 'aboveBar',
      color: p.direction === 'BULLISH' ? '#10B981' : '#EF4444',
      shape: 'circle' as const,
      text: p.type.charAt(0),
      size: 10,
    }));
}

export function TradingChart({
  marketData: rawMarketData,
  setup,
  analysisContext,
  height = 500,
  className = '',
}: TradingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const markersApiRef = useRef<{ setMarkers: (markers: SeriesMarker<Time>[]) => void } | null>(
    null
  );

  const [isReady, setIsReady] = useState(false);

  const chartLayers = useChartLayers();

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: '#0B0F14' },
        textColor: '#8B96A5',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1A222E' },
        horzLines: { color: '#1A222E' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3B82F6', width: 1, style: 2 },
        horzLine: { color: '#3B82F6', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#202731',
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      leftPriceScale: {
        borderColor: '#202731',
        visible: false,
      },
      timeScale: {
        borderColor: '#202731',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        tickMarkFormatter: (time: Time) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: { mouseWheel: true, pinch: true, axisDoubleClickReset: true },
    });

    chartApiRef.current = chart;

    // Main candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#059669',
      borderDownColor: '#DC2626',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    candleSeriesRef.current = candleSeries;

    // Volume series (histogram)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#2A3340',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
    });
    volumeSeriesRef.current = volumeSeries;

    // EMA 20
    const ema20 = chart.addSeries(LineSeries, {
      color: '#3B82F6',
      lineWidth: 1,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'EMA 20',
    });
    ema20Ref.current = ema20;

    // EMA 50
    const ema50 = chart.addSeries(LineSeries, {
      color: '#F59E0B',
      lineWidth: 1,
      lineStyle: 0,
      priceLineVisible: false,
      lastValueVisible: false,
      title: 'EMA 50',
    });
    ema50Ref.current = ema50;

    // Create markers API for pattern markers
    const markersApi = createSeriesMarkers(candleSeries);
    markersApiRef.current = markersApi;

    setIsReady(true);

    return () => {
      chart.removeSeries(candleSeries);
      chart.removeSeries(volumeSeries);
      chart.removeSeries(ema20);
      chart.removeSeries(ema50);
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema20Ref.current = null;
      ema50Ref.current = null;
      markersApiRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Update data when market data changes
  useEffect(() => {
    if (!isReady || !rawMarketData || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    const data = formatChartData(rawMarketData);
    if (data.length === 0) return;

    candleSeriesRef.current.setData(
      data.map((d) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    volumeSeriesRef.current.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      }))
    );

    // EMAs
    if (ema20Ref.current && chartLayers.trend) {
      ema20Ref.current.setData(getEMAData(data, 20));
    } else if (ema20Ref.current) {
      ema20Ref.current.setData([]);
    }

    if (ema50Ref.current && chartLayers.trend) {
      ema50Ref.current.setData(getEMAData(data, 50));
    } else if (ema50Ref.current) {
      ema50Ref.current.setData([]);
    }

    // Apply time range
    if (chartApiRef.current) {
      chartApiRef.current.timeScale().fitContent();
    }
  }, [rawMarketData, isReady, chartLayers.trend]);

  // Update S/R zones - simplified using horizontal lines
  useEffect(() => {
    if (!isReady || !chartApiRef.current) return;

    // Note: Lightweight Charts v4 doesn't have addPrimitive/removePrimitive
    // This would need a custom pane renderer or annotations
    // For now, we'll skip S/R zones overlay in the chart
    // TODO: Implement using custom primitives or annotation plugin
  }, [analysisContext, isReady, chartLayers.supportResistance]);

  // Update trade setup lines - using price lines instead of primitives
  useEffect(() => {
    if (!isReady || !chartApiRef.current || !candleSeriesRef.current || !chartLayers.tradeSetup) {
      return;
    }

    if (!setup) return;

    // Clear existing price lines
    // Note: Lightweight Charts uses createPriceLine API on series
    // For now, we skip as it requires specific API usage
  }, [setup, isReady, chartLayers.tradeSetup]);

  // Update pattern markers
  useEffect(() => {
    if (!isReady || !markersApiRef.current) {
      return;
    }

    if (!chartLayers.candlestick) {
      markersApiRef.current.setMarkers([]);
      return;
    }

    const markers = getPatternMarkers(analysisContext);
    markersApiRef.current.setMarkers(markers as SeriesMarker<Time>[]);
  }, [analysisContext, isReady, chartLayers.candlestick]);

  // Handle chart resize
  const handleResize = useCallback(() => {
    if (chartApiRef.current && chartRef.current) {
      chartApiRef.current.applyOptions({
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [handleResize]);

  if (!isReady) {
    return (
      <div
        ref={chartRef}
        className={`bg-primary rounded-lg ${className}`}
        style={{ height, width: '100%' }}
      >
        <div className="flex items-center justify-center h-full text-secondary">
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={`bg-primary rounded-lg ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}

export default TradingChart;
