/**
 * Watchlist API
 * GET /api/watchlists - List all watchlists
 * POST /api/watchlists - Create a new watchlist
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWatchlistService } from '@/server/services/watchlist-service';
import type { WatchlistCreateInput } from '@/server/watchlist/watchlist-service';

const CreateWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  symbols: z
    .array(
      z.object({
        symbol: z.string().min(1),
        exchange: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const service = getWatchlistService();
    const watchlists = service.list();

    return NextResponse.json({
      watchlists,
    });
  } catch (error) {
    console.error('Watchlist list error:', error);
    return NextResponse.json({ error: 'Failed to list watchlists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateWatchlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = getWatchlistService();
    const input: WatchlistCreateInput = {
      name: parsed.data.name,
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.symbols !== undefined
        ? {
            symbols: parsed.data.symbols.map((s) => ({
              symbol: s.symbol,
              exchange: s.exchange,
              ...(s.notes !== undefined ? { notes: s.notes } : {}),
            })),
          }
        : {}),
    };

    const watchlist = service.create(input);

    return NextResponse.json({ watchlist }, { status: 201 });
  } catch (error) {
    console.error('Watchlist create error:', error);
    return NextResponse.json({ error: 'Failed to create watchlist' }, { status: 500 });
  }
}
