/**
 * Watchlist Symbols API
 * POST /api/watchlists/[id]/symbols - Add a symbol to watchlist
 * DELETE /api/watchlists/[id]/symbols - Remove a symbol from watchlist
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWatchlistService } from '@/server/services/watchlist-service';
import type { AddSymbolInput } from '@/server/watchlist/watchlist-service';

const AddSymbolSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().min(1),
  notes: z.string().optional(),
});

const RemoveSymbolSchema = z.object({
  symbol: z.string().min(1),
  exchange: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = AddSymbolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = getWatchlistService();
    const input: AddSymbolInput = {
      symbol: parsed.data.symbol,
      exchange: parsed.data.exchange,
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    };

    const watchlist = service.addSymbol(id, input);

    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error('Add symbol error:', error);
    return NextResponse.json({ error: 'Failed to add symbol' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = RemoveSymbolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const service = getWatchlistService();
    const watchlist = service.removeSymbol(id, parsed.data.symbol, parsed.data.exchange);

    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error('Remove symbol error:', error);
    return NextResponse.json({ error: 'Failed to remove symbol' }, { status: 500 });
  }
}
