/**
 * Symbol Search API
 * GET /api/symbols?query=RELI
 * Returns matching symbols from Yahoo Finance
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { YahooFinanceProvider } from '@/lib/market-data';

const provider = new YahooFinanceProvider();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: 'Query parameter "query" is required (min 1 character)' },
      { status: 400 }
    );
  }

  try {
    const results = await provider.searchSymbols(query);

    // Cache-Control header for client-side caching
    const response = NextResponse.json(results);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Symbol search error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: `Search failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ error: 'Search failed: Unknown error' }, { status: 500 });
  }
}
