/**
 * Symbol Domain Types
 * Trading symbol metadata and exchange information
 */

export type Exchange = 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' | 'LSE' | 'TSE';

export interface Symbol {
  exchange: Exchange;
  symbol: string; // e.g., "RELIANCE" or "RELIANCE.NS"
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  currency: string;
  isActive: boolean;
  lotSize?: number;
  tickSize?: number;
}

export interface SymbolWithDetails extends Symbol {
  description?: string;
  website?: string;
  listingDate?: Date;
  faceValue?: number;
  isin?: string;
}

export const EXCHANGE_SUFFIXES: Record<Exchange, string> = {
  NSE: '.NS',
  BSE: '.BO',
  NASDAQ: '',
  NYSE: '',
  LSE: '.L',
  TSE: '.T',
};

export function normalizeSymbol(symbol: string, exchange: Exchange): string {
  const suffix = EXCHANGE_SUFFIXES[exchange];
  if (!suffix) return symbol;
  if (symbol.endsWith(suffix)) return symbol;
  return `${symbol}${suffix}`;
}

export function parseSymbol(fullSymbol: string): { symbol: string; exchange: Exchange } | null {
  // Try to detect exchange from suffix
  for (const [exchange, suffix] of Object.entries(EXCHANGE_SUFFIXES)) {
    if (suffix && fullSymbol.endsWith(suffix)) {
      return {
        symbol: fullSymbol.slice(0, -suffix.length),
        exchange: exchange as Exchange,
      };
    }
  }
  // Default to NSE for Indian symbols without suffix
  if (/^[A-Z]{1,10}$/.test(fullSymbol)) {
    return { symbol: fullSymbol, exchange: 'NSE' };
  }
  return null;
}
