/**
 * Market Data API
 * GET /api/market-data?symbol=RELIANCE&exchange=NSE&timeframe=4h&limit=200
 * Returns historical candles for charting
 */
import { NextResponse } from 'next/server';
import { YahooFinanceProvider } from '@/lib/market-data';
import { z } from 'zod';

const QuerySchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().optional(),
  timeframe: z.enum(['1d', '4h', '1h', '30m']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const symbol = parsed.data.symbol.toUpperCase();
    const timeframe = parsed.data.timeframe ?? '4h';
    const limit = parsed.data.limit ?? 200;

    const provider = new YahooFinanceProvider();

    // Calculate date range based on timeframe and limit
    const to = new Date();
    const timeframeMs: Record<string, number> = {
      '1d': 24 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '30m': 30 * 60 * 1000,
    };

    const timeframeMsValue = timeframeMs[timeframe];
    if (!timeframeMsValue) {
      return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 });
    }
    const from = new Date(to.getTime() - timeframeMsValue * limit * 1.5); // Extra buffer

    const candles = await provider.getHistoricalCandles(symbol, timeframe, from, to);

    // Limit to requested amount
    const limitedCandles = candles.slice(-limit);

    // Get latest quote for price metadata
    const quote = await provider.getLatestQuote(symbol);

    return NextResponse.json({
      success: true,
      data: limitedCandles.map((c) => ({
        time: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      quote: {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        close: quote.price,
        lastPrice: quote.price,
      },
    });
  } catch (error) {
    console.error('Market data error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch market data: ${message}` }, { status: 500 });
  }
}
