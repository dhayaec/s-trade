import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to create mock before module evaluation
const { mockSearchSymbols } = vi.hoisted(() => ({
  mockSearchSymbols: vi.fn(),
}));

vi.mock('@/lib/market-data/yahoo-finance', () => {
  class MockYahooFinanceProvider {
    searchSymbols = mockSearchSymbols;
  }
  return { YahooFinanceProvider: MockYahooFinanceProvider };
});

// Import after mocking
import { GET } from '@/app/api/symbols/route';

describe('GET /api/symbols', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when query parameter is missing', async () => {
    const request = new NextRequest(new URL('http://localhost/api/symbols'));
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query parameter "query" is required (min 1 character)');
  });

  it('should return 400 when query parameter is empty', async () => {
    const request = new NextRequest(new URL('http://localhost/api/symbols?query='));
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Query parameter "query" is required (min 1 character)');
  });

  it('should return search results for valid query', async () => {
    const mockResults = [
      {
        symbol: 'RELIANCE.NS',
        name: 'Reliance Industries Limited',
        exchange: 'NSE',
        type: 'EQUITY',
        currency: 'INR',
      },
      {
        symbol: 'TCS.NS',
        name: 'Tata Consultancy Services Limited',
        exchange: 'NSE',
        type: 'EQUITY',
        currency: 'INR',
      },
    ];

    mockSearchSymbols.mockResolvedValue(mockResults);

    const request = new NextRequest(new URL('http://localhost/api/symbols?query=RELI'));
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResults);
    expect(mockSearchSymbols).toHaveBeenCalledWith('RELI');
  });

  it('should return empty array when no results found', async () => {
    mockSearchSymbols.mockResolvedValue([]);

    const request = new NextRequest(new URL('http://localhost/api/symbols?query=XYZ123'));
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should return 500 when provider throws error', async () => {
    mockSearchSymbols.mockRejectedValue(new Error('API error'));

    const request = new NextRequest(new URL('http://localhost/api/symbols?query=RELI'));
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Search failed: API error');
  });

  it('should set Cache-Control header', async () => {
    mockSearchSymbols.mockResolvedValue([]);

    const request = new NextRequest(new URL('http://localhost/api/symbols?query=RELI'));
    const response = await GET(request);

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=60, stale-while-revalidate=300'
    );
  });

  it('should handle unknown errors', async () => {
    mockSearchSymbols.mockRejectedValue('unknown error');

    const request = new NextRequest(new URL('http://localhost/api/symbols?query=RELI'));
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Search failed: Unknown error');
  });
});
