/**
 * Market Structure Detection
 * Detects HH/HL, LH/LL, BOS (Break of Structure), CHoCH (Change of Character)
 */
import type { Candle } from '@/types/market-data';
import type { SwingPoint, MarketStructure, MarketStructureType } from '@/types/price-action';
import { getLastSwingHigh, getLastSwingLow } from './swing-points';

/**
 * Detect market structure from swing points
 * Identifies trend type (HH/HL, LH/LL, etc.), BOS, and CHoCH
 */
export function detectMarketStructure(candles: Candle[], swings: SwingPoint[]): MarketStructure {
  const swingHighs = swings.filter((s) => s.type === 'HIGH');
  const swingLows = swings.filter((s) => s.type === 'LOW');

  const result: MarketStructure = {
    type: 'UNKNOWN',
    swingHighs,
    swingLows,
    currentTrend: 'NEUTRAL',
    bosDetected: false,
    chochDetected: false,
    lastSwingHigh: undefined,
    lastSwingLow: undefined,
    bosLevel: undefined,
    chochLevel: undefined,
  };

  if (swingHighs.length < 2 || swingLows.length < 2) {
    return result;
  }

  // Determine structure type
  const structureType = determineStructureType(swingHighs, swingLows);
  result.type = structureType;

  // Determine current trend
  result.currentTrend = determineTrend(structureType, swingHighs, swingLows);

  // Get last swings
  result.lastSwingHigh = getLastSwingHigh(swingHighs);
  result.lastSwingLow = getLastSwingLow(swingLows);

  // Detect Break of Structure (BOS)
  const bos = detectBOS(candles, swingHighs, swingLows, structureType);
  if (bos) {
    result.bosDetected = true;
    result.bosLevel = bos.level;
  }

  // Detect Change of Character (CHoCH)
  const choch = detectCHoCH(candles, swingHighs, swingLows, structureType);
  if (choch) {
    result.chochDetected = true;
    result.chochLevel = choch.level;
  }

  return result;
}

/**
 * Determine the market structure type from swing points
 */
function determineStructureType(
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[]
): MarketStructureType {
  if (swingHighs.length < 2 || swingLows.length < 2) {
    return 'UNKNOWN';
  }

  // Get last two swing highs and lows
  const lastTwoHighs = swingHighs.slice(-2);
  const lastTwoLows = swingLows.slice(-2);

  const prevHigh = lastTwoHighs[0]!;
  const lastHigh = lastTwoHighs[1]!;
  const prevLow = lastTwoLows[0]!;
  const lastLow = lastTwoLows[1]!;

  const higherHigh = lastHigh.price > prevHigh.price;
  const lowerHigh = lastHigh.price < prevHigh.price;
  const higherLow = lastLow.price > prevLow.price;
  const lowerLow = lastLow.price < prevLow.price;

  if (higherHigh && higherLow) return 'HH_HL';
  if (lowerHigh && lowerLow) return 'LH_LL';
  if (higherHigh && lowerLow) return 'HH_LL';
  if (lowerHigh && higherLow) return 'LH_HL';

  return 'RANGING';
}

/**
 * Determine current trend from structure
 */
function determineTrend(
  structure: MarketStructureType,
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[]
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  switch (structure) {
    case 'HH_HL':
      return 'BULLISH';
    case 'LH_LL':
      return 'BEARISH';
    case 'HH_LL':
    case 'LH_HL':
      // Expanding/contracting - check which is more recent
      const lastHigh = getLastSwingHigh(swingHighs);
      const lastLow = getLastSwingLow(swingLows);
      if (lastHigh && lastLow) {
        const highTime = lastHigh.timestamp;
        const lowTime = lastLow.timestamp;
        return highTime > lowTime ? 'BULLISH' : 'BEARISH';
      }
      return 'NEUTRAL';
    default:
      return 'NEUTRAL';
  }
}

/**
 * Detect Break of Structure (BOS)
 * In uptrend: price breaks above previous swing high
 * In downtrend: price breaks below previous swing low
 */
function detectBOS(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
  structure: MarketStructureType
): { level: number } | null {
  if (candles.length === 0) return null;

  const lastCandle = candles[candles.length - 1]!;

  if (structure === 'HH_HL' && swingHighs.length >= 2) {
    // Uptrend - check if price broke above the second-to-last swing high
    const prevHigh = swingHighs[swingHighs.length - 2]!;
    if (lastCandle.close > prevHigh.price && lastCandle.high > prevHigh.price) {
      return { level: prevHigh.price };
    }
  }

  if (structure === 'LH_LL' && swingLows.length >= 2) {
    // Downtrend - check if price broke below the second-to-last swing low
    const prevLow = swingLows[swingLows.length - 2]!;
    if (lastCandle.close < prevLow.price && lastCandle.low < prevLow.price) {
      return { level: prevLow.price };
    }
  }

  return null;
}

/**
 * Detect Change of Character (CHoCH)
 * Trend structure changes (e.g., from HH/HL to LH/LL)
 */
function detectCHoCH(
  candles: Candle[],
  swingHighs: SwingPoint[],
  swingLows: SwingPoint[],
  structure: MarketStructureType
): { level: number } | null {
  if (candles.length === 0) return null;

  const lastCandle = candles[candles.length - 1]!;

  if (structure === 'HH_HL' && swingLows.length >= 2) {
    // Was uptrend, check if price broke below recent swing low
    const lastLow = swingLows[swingLows.length - 1]!;
    if (lastCandle.close < lastLow.price && lastCandle.low < lastLow.price) {
      return { level: lastLow.price };
    }
  }

  if (structure === 'LH_LL' && swingHighs.length >= 2) {
    // Was downtrend, check if price broke above recent swing high
    const lastHigh = swingHighs[swingHighs.length - 1]!;
    if (lastCandle.close > lastHigh.price && lastCandle.high > lastHigh.price) {
      return { level: lastHigh.price };
    }
  }

  return null;
}
