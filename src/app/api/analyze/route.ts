/**
 * Single Symbol Analysis API
 * POST /api/analyze - Analyze a single symbol
 * Body: { symbol, exchange?, timeframe?, strategies? }
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getScannerService } from '@/server/services/watchlist-service';
import type { ScanRequest } from '@/types/scanner';
import type { StrategyType } from '@/types/strategy';
import type { Timeframe } from '@/types/market-data';

const AnalyzeSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().optional(),
  timeframe: z.enum(['1d', '4h', '1h']).optional(),
  strategies: z.array(z.enum(['BREAKOUT', 'PULLBACK', 'SUPPORT_BOUNCE', 'REVERSAL'])).optional(),
  minScore: z.number().optional(),
  minRiskReward: z.number().optional(),
});

export const maxDuration = 60; // Allow moderate analysis time

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AnalyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const scanner = getScannerService();

    const symbol = parsed.data.symbol.toUpperCase();
    const timeframe: Timeframe = parsed.data.timeframe ?? '4h';
    const strategies: StrategyType[] = parsed.data.strategies ?? [
      'BREAKOUT',
      'PULLBACK',
      'SUPPORT_BOUNCE',
      'REVERSAL',
    ];

    const scanRequest: ScanRequest = {
      symbols: [symbol],
      timeframe,
      strategies,
      ...(parsed.data.minScore !== undefined ? { minScore: parsed.data.minScore } : {}),
      ...(parsed.data.minRiskReward !== undefined
        ? { minRiskReward: parsed.data.minRiskReward }
        : {}),
    };

    const scan = await scanner.scanSymbols(scanRequest);

    if (!scan.results.length) {
      return NextResponse.json(
        { error: 'Analysis failed', details: scan.results[0]?.error ?? 'No result' },
        { status: 500 }
      );
    }

    const result = scan.results[0];

    return NextResponse.json({
      result,
      summary: scan.summary,
    });
  } catch (error) {
    console.error('Single symbol analyze error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
