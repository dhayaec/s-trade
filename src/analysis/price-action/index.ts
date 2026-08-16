/**
 * Price Action Module - Main Export
 * Swing points, market structure, support/resistance, breakouts, pullbacks
 */

export { findSwingPoints, getLastSwingHigh, getLastSwingLow } from './swing-points';

export { detectMarketStructure } from './market-structure';

export {
  findSupportResistanceZones,
  getNearestSupport,
  getNearestResistance,
} from './support-resistance';

export { detectBreakouts, getCurrentBreakout, isBreakoutValid } from './breakout';

export { detectPullbacks, getCurrentPullback } from './pullback';

export {
  detectConsolidation,
  isInConsolidation,
  getConsolidationBreakoutLevel,
} from './consolidation';

// Re-export types
export type {
  SwingPoint,
  MarketStructure,
  MarketStructureType,
  PriceZone,
  ZoneSource,
  SupportResistanceResult,
  Breakout,
  BreakoutResult,
  Pullback,
  PullbackResult,
  ConsolidationRange,
} from '@/types/price-action';
