/**
 * Vitest setup for analysis tests
 * Extends global setup with analysis-specific configuration
 */
import { beforeAll, afterAll } from 'vitest';

// Global test setup for analysis module
beforeAll(() => {
  // Set up any global test configuration
});

afterAll(() => {
  // Clean up after all tests
});

// Helper to load fixture files
export async function loadFixture<T>(path: string): Promise<T> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content) as T;
}

// Candle fixture paths
export const FIXTURES = {
  candles: {
    '1d': 'tests/analysis/fixtures/candles/RELIANCE-1D.json',
    '4h': 'tests/analysis/fixtures/candles/RELIANCE-4H.json',
    '1h': 'tests/analysis/fixtures/candles/RELIANCE-1H.json',
  },
  symbols: 'tests/analysis/fixtures/symbols.json',
  setups: {
    breakout: 'tests/analysis/fixtures/setups/breakout-example.json',
    pullback: 'tests/analysis/fixtures/setups/pullback-example.json',
  },
};
