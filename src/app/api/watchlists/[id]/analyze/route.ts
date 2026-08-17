/**
 * Watchlist Analyze API
 * POST /api/watchlists/[id]/analyze - Analyze all symbols in a watchlist
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getWatchlistService, parseScanParams } from '@/server/services/watchlist-service';
import type { ScanRequest } from '@/types/scanner';

export const maxDuration = 300; // Allow long-running scans

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const service = getWatchlistService();

    const watchlist = service.get(id);
    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    const { timeframe, strategies, minScore, minRiskReward } = parseScanParams(
      request.nextUrl.searchParams
    );

    const watchlistStrategies: ScanRequest['strategies'] = strategies;

    const result = await service.analyze(id, timeframe, watchlistStrategies);

    if (!result) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    return NextResponse.json({ result, minScore, minRiskReward });
  } catch (error) {
    console.error('Watchlist analyze error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  }
}
