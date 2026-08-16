/**
 * Support and Resistance Zone Detection
 * Identifies price zones (not single prices) from multiple sources
 */
import type { Candle } from '@/types/market-data';
import type { SwingPoint, PriceZone, ZoneSource } from '@/types/price-action';

const ZONE_TOLERANCE_PCT = 0.015; // 1.5% tolerance for grouping touches
const MIN_TOUCHES_FOR_ZONE = 2;
const MIN_STRENGTH_FOR_ZONE = 20;

/**
 * Find support and resistance zones from candles and swing points
 * Combines multiple sources: swing points, previous highs/lows, CPR, EMAs
 */
export function findSupportResistanceZones(
  candles: Candle[],
  swings: SwingPoint[],
  options: {
    timeframe?: string;
    prevDayHigh?: number;
    prevDayLow?: number;
    prevWeekHigh?: number;
    prevWeekLow?: number;
    cprPivot?: number;
    cprBC?: number;
    cprTC?: number;
    ema20?: number;
    ema50?: number;
    ema200?: number;
  } = {}
): { supportZones: PriceZone[]; resistanceZones: PriceZone[] } {
  if (candles.length === 0) {
    return { supportZones: [], resistanceZones: [] };
  }

  const zones: PriceZone[] = [];

  // 1. Add swing point zones
  zones.push(...swingPointsToZones(swings, options.timeframe));

  // 2. Add previous day/week levels
  if (options.prevDayHigh !== undefined) {
    zones.push(
      createZoneFromLevel(options.prevDayHigh, 'RESISTANCE', 'PREV_DAY_HIGH', options.timeframe)
    );
  }
  if (options.prevDayLow !== undefined) {
    zones.push(
      createZoneFromLevel(options.prevDayLow, 'SUPPORT', 'PREV_DAY_LOW', options.timeframe)
    );
  }
  if (options.prevWeekHigh !== undefined) {
    zones.push(
      createZoneFromLevel(options.prevWeekHigh, 'RESISTANCE', 'PREV_WEEK_HIGH', options.timeframe)
    );
  }
  if (options.prevWeekLow !== undefined) {
    zones.push(
      createZoneFromLevel(options.prevWeekLow, 'SUPPORT', 'PREV_WEEK_LOW', options.timeframe)
    );
  }

  // 3. Add CPR levels
  if (options.cprPivot !== undefined) {
    zones.push(createZoneFromLevel(options.cprPivot, 'SUPPORT', 'CPR_PIVOT', options.timeframe));
    zones.push(createZoneFromLevel(options.cprPivot, 'RESISTANCE', 'CPR_PIVOT', options.timeframe));
  }
  if (options.cprBC !== undefined) {
    zones.push(createZoneFromLevel(options.cprBC, 'SUPPORT', 'CPR_BC', options.timeframe));
  }
  if (options.cprTC !== undefined) {
    zones.push(createZoneFromLevel(options.cprTC, 'RESISTANCE', 'CPR_TC', options.timeframe));
  }

  // 4. Add EMA levels
  if (options.ema20 !== undefined) {
    zones.push(createZoneFromLevel(options.ema20, 'SUPPORT', 'EMA_20', options.timeframe));
    zones.push(createZoneFromLevel(options.ema20, 'RESISTANCE', 'EMA_20', options.timeframe));
  }
  if (options.ema50 !== undefined) {
    zones.push(createZoneFromLevel(options.ema50, 'SUPPORT', 'EMA_50', options.timeframe));
    zones.push(createZoneFromLevel(options.ema50, 'RESISTANCE', 'EMA_50', options.timeframe));
  }
  if (options.ema200 !== undefined) {
    zones.push(createZoneFromLevel(options.ema200, 'SUPPORT', 'EMA_200', options.timeframe));
    zones.push(createZoneFromLevel(options.ema200, 'RESISTANCE', 'EMA_200', options.timeframe));
  }

  // 5. Group nearby zones
  const groupedZones = groupZones(zones);

  // 6. Calculate strength and filter
  const validZones = groupedZones
    .map((zone) => calculateZoneStrength(zone, candles))
    .filter(
      (zone) => zone.touches >= MIN_TOUCHES_FOR_ZONE && zone.strength >= MIN_STRENGTH_FOR_ZONE
    );

  // 7. Separate support and resistance
  const supportZones = validZones.filter((z) => z.type === 'SUPPORT');
  const resistanceZones = validZones.filter((z) => z.type === 'RESISTANCE');

  // 8. Check if zones are broken
  const lastCandle = candles[candles.length - 1]!;
  const currentPrice = lastCandle.close;
  for (const zone of validZones) {
    if (zone.type === 'RESISTANCE' && currentPrice > zone.upper) {
      zone.isBroken = true;
      zone.brokenAt = lastCandle.timestamp;
    } else if (zone.type === 'SUPPORT' && currentPrice < zone.lower) {
      zone.isBroken = true;
      zone.brokenAt = lastCandle.timestamp;
    }
  }

  return { supportZones, resistanceZones };
}

/**
 * Convert swing points to zones
 */
function swingPointsToZones(swings: SwingPoint[], timeframe?: string): PriceZone[] {
  const zones: PriceZone[] = [];

  for (const swing of swings) {
    const type = swing.type === 'HIGH' ? 'RESISTANCE' : 'SUPPORT';
    const source: ZoneSource = swing.type === 'HIGH' ? 'SWING_HIGH' : 'SWING_LOW';

    const zone = createZoneFromLevel(swing.price, type, source, timeframe);
    zone.firstTouch = swing.timestamp;
    zone.lastTouch = swing.timestamp;
    zone.volumeAtTouches = []; // Will be filled when calculating strength
    zones.push(zone);
  }

  return zones;
}

/**
 * Create a zone from a single price level
 */
function createZoneFromLevel(
  price: number,
  type: 'SUPPORT' | 'RESISTANCE',
  source: ZoneSource,
  timeframe?: string
): PriceZone {
  const tolerance = price * ZONE_TOLERANCE_PCT;
  return {
    lower: price - tolerance,
    upper: price + tolerance,
    center: price,
    type,
    strength: 0, // Will be calculated later
    touches: 1,
    timeframe: timeframe || 'unknown',
    sources: [source],
    firstTouch: 0, // Will be set when actual touches are counted
    lastTouch: 0,
    volumeAtTouches: [],
    isBroken: false,
    brokenAt: undefined,
  };
}

/**
 * Group nearby zones together
 */
function groupZones(zones: PriceZone[]): PriceZone[] {
  if (zones.length <= 1) return zones;

  // Sort by center price
  const sorted = [...zones].sort((a, b) => a.center - b.center);

  const grouped: PriceZone[] = [];
  let currentGroup = sorted[0]!;

  for (let i = 1; i < sorted.length; i++) {
    const zone = sorted[i]!;

    // Check if zones overlap or are very close
    if (zone.lower <= currentGroup.upper * (1 + ZONE_TOLERANCE_PCT)) {
      // Merge zones
      currentGroup = mergeZones(currentGroup, zone);
    } else {
      grouped.push(currentGroup);
      currentGroup = zone;
    }
  }

  grouped.push(currentGroup);
  return grouped;
}

/**
 * Merge two zones
 */
function mergeZones(zone1: PriceZone, zone2: PriceZone): PriceZone {
  const newLower = Math.min(zone1.lower, zone2.lower);
  const newUpper = Math.max(zone1.upper, zone2.upper);
  const newCenter = (newLower + newUpper) / 2;

  // Determine type based on majority
  const isSupport = zone1.type === 'SUPPORT' && zone2.type === 'SUPPORT';

  return {
    lower: newLower,
    upper: newUpper,
    center: newCenter,
    type: isSupport ? 'SUPPORT' : 'RESISTANCE',
    strength: 0,
    touches: zone1.touches + zone2.touches,
    timeframe: zone1.timeframe,
    sources: [...new Set([...zone1.sources, ...zone2.sources])],
    firstTouch: Math.min(zone1.firstTouch, zone2.firstTouch),
    lastTouch: Math.max(zone1.lastTouch, zone2.lastTouch),
    volumeAtTouches: [...zone1.volumeAtTouches, ...zone2.volumeAtTouches],
    isBroken: zone1.isBroken || zone2.isBroken,
    brokenAt: zone1.brokenAt || zone2.brokenAt,
  };
}

/**
 * Calculate zone strength based on touches, volume, timeframe, etc.
 */
function calculateZoneStrength(zone: PriceZone, candles: Candle[]): PriceZone {
  const lastCandle = candles[candles.length - 1]!;
  const currentPrice = lastCandle.close;

  // Count actual price touches within the zone
  let touches = 0;
  const volumes: number[] = [];
  let firstTouch = Infinity;
  let lastTouch = 0;

  for (const candle of candles) {
    const touched = candle.high >= zone.lower && candle.low <= zone.upper;
    if (touched) {
      touches++;
      volumes.push(candle.volume);
      if (candle.timestamp < firstTouch) firstTouch = candle.timestamp;
      if (candle.timestamp > lastTouch) lastTouch = candle.timestamp;
    }
  }

  zone.touches = touches;
  zone.volumeAtTouches = volumes;
  if (firstTouch !== Infinity) zone.firstTouch = firstTouch;
  zone.lastTouch = lastTouch;

  // Base strength from touch count
  let strength = Math.min(50, touches * 10);

  // Volume factor
  if (volumes.length > 0) {
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
    const zoneAvgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const volumeRatio = zoneAvgVolume / avgVolume;
    if (volumeRatio > 1.5) strength += 20;
    else if (volumeRatio > 1) strength += 10;
  }

  // Timeframe factor
  const timeframeWeight: Record<string, number> = {
    '1d': 20,
    '4h': 15,
    '1h': 10,
    '30m': 5,
    '15m': 5,
  };
  strength += timeframeWeight[zone.timeframe.toLowerCase()] || 0;

  // Source diversity
  const uniqueSources = new Set(zone.sources).size;
  strength += uniqueSources * 5;

  // Recency factor - more recent touches = stronger
  if (lastTouch > 0) {
    const candlesSinceTouch =
      candles.length - 1 - candles.findIndex((c) => c.timestamp === lastTouch);
    if (candlesSinceTouch <= 5) strength += 15;
    else if (candlesSinceTouch <= 10) strength += 10;
    else if (candlesSinceTouch <= 20) strength += 5;
  }

  // Distance from current price - closer = more relevant
  const distancePct = Math.abs(currentPrice - zone.center) / currentPrice;
  if (distancePct < 0.02)
    strength += 15; // Within 2%
  else if (distancePct < 0.05)
    strength += 10; // Within 5%
  else if (distancePct < 0.1) strength += 5; // Within 10%

  zone.strength = Math.min(100, Math.max(0, strength));
  return zone;
}

/**
 * Get the nearest support zone below current price
 */
export function getNearestSupport(zones: PriceZone[], currentPrice: number): PriceZone | undefined {
  const supports = zones
    .filter((z) => z.type === 'SUPPORT' && z.center < currentPrice)
    .sort((a, b) => b.center - a.center);
  return supports[0];
}

/**
 * Get the nearest resistance zone above current price
 */
export function getNearestResistance(
  zones: PriceZone[],
  currentPrice: number
): PriceZone | undefined {
  const resistances = zones
    .filter((z) => z.type === 'RESISTANCE' && z.center > currentPrice)
    .sort((a, b) => a.center - b.center);
  return resistances[0];
}
