/**
 * Market Regime API
 * GET /api/market-regime - Get current market regime
 * Returns: { trend, momentum, volatility, breadth }
 */
import { NextResponse } from 'next/server';
import { YahooFinanceProvider } from '@/lib/market-data';

export const maxDuration = 30;

export async function GET() {
  try {
    const provider = new YahooFinanceProvider();

    // Fetch NIFTY 50 and BANK NIFTY for regime detection
    const [niftyQuote, bankNiftyQuote] = await Promise.all([
      provider.getLatestQuote('NIFTY'),
      provider.getLatestQuote('BANKNIFTY'),
    ]);

    // Simple regime detection based on price vs EMAs
    const niftyData = await provider.getHistoricalCandles(
      'NIFTY',
      '1d',
      new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      new Date()
    );

    if (!niftyData.length) {
      return NextResponse.json({
        data: {
          trend: 'NEUTRAL',
          momentum: 'NEUTRAL',
          volatility: 'NORMAL',
          breadth: 'STABLE',
        },
      });
    }

    // Calculate simple EMAs
    const closes = niftyData.map((c) => c.close);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);

    // Check all required values exist
    if (!closes.length || !ema20.length || !ema50.length || !ema200.length) {
      return NextResponse.json({
        data: {
          trend: 'NEUTRAL',
          momentum: 'NEUTRAL',
          volatility: 'NORMAL',
          breadth: 'STABLE',
        },
      });
    }

    const currentPrice = closes[closes.length - 1];
    const currentEma20 = ema20[ema20.length - 1];
    const currentEma50 = ema50[ema50.length - 1];
    const currentEma200 = ema200[ema200.length - 1];

    if (
      currentPrice === undefined ||
      currentEma20 === undefined ||
      currentEma50 === undefined ||
      currentEma200 === undefined
    ) {
      return NextResponse.json({
        data: {
          trend: 'NEUTRAL',
          momentum: 'NEUTRAL',
          volatility: 'NORMAL',
          breadth: 'STABLE',
        },
      });
    }

    // Determine trend
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (
      currentPrice > currentEma20 &&
      currentEma20 > currentEma50 &&
      currentEma50 > currentEma200
    ) {
      trend = 'BULLISH';
    } else if (
      currentPrice < currentEma20 &&
      currentEma20 < currentEma50 &&
      currentEma50 < currentEma200
    ) {
      trend = 'BEARISH';
    }

    // Determine momentum (RSI-like)
    let momentum: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
    const lastClose = closes[closes.length - 1];
    const close14Ago = closes[closes.length - 14];
    if (lastClose !== undefined && close14Ago !== undefined && close14Ago !== 0) {
      const recentChange = ((lastClose - close14Ago) / close14Ago) * 100;
      if (recentChange > 2) momentum = 'POSITIVE';
      else if (recentChange < -2) momentum = 'NEGATIVE';
    }

    // Determine volatility (ATR-based)
    let volatility: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL';
    const atr = calculateATR(niftyData.slice(-14), 14);
    const atrPct = (atr / currentPrice) * 100;
    if (atrPct > 2) volatility = 'HIGH';
    else if (atrPct < 1) volatility = 'LOW';

    // Breadth (simplified - would use advance/decline in production)
    let breadth: 'IMPROVING' | 'DETERIORATING' | 'STABLE' = 'STABLE';
    if (trend === 'BULLISH' && momentum === 'POSITIVE') breadth = 'IMPROVING';
    else if (trend === 'BEARISH' && momentum === 'NEGATIVE') breadth = 'DETERIORATING';

    return NextResponse.json({
      data: {
        trend,
        momentum,
        volatility,
        breadth,
        nifty: {
          price: niftyQuote.price,
          change: niftyQuote.change,
          changePercent: niftyQuote.changePercent,
        },
        bankNifty: {
          price: bankNiftyQuote.price,
          change: bankNiftyQuote.change,
          changePercent: bankNiftyQuote.changePercent,
        },
      },
    });
  } catch (error) {
    console.error('Market regime error:', error);
    return NextResponse.json({
      data: {
        trend: 'NEUTRAL',
        momentum: 'NEUTRAL',
        volatility: 'NORMAL',
        breadth: 'STABLE',
      },
    });
  }
}

function calculateEMA(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  const initialValues = values.slice(0, period);
  const sum = initialValues.reduce((a, b) => a + b, 0);
  const prevEma = sum / period;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      ema.push(NaN);
    } else if (i === period - 1) {
      ema.push(prevEma);
    } else {
      const currentValue = values[i];
      if (currentValue === undefined) continue;
      const newEma = currentValue * k + prevEma * (1 - k);
      ema.push(newEma);
    }
  }
  return ema;
}

function calculateATR(
  candles: { high: number; low: number; close: number }[],
  period: number
): number {
  if (candles.length < 2) return 0;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    if (!candle || !prevCandle) continue;

    const high = candle.high;
    const low = candle.low;
    const prevClose = prevCandle.close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  // Simple ATR (not smoothed)
  const recent = trueRanges.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / period;
}
