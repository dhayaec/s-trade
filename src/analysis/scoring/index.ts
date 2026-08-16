/**
 * Setup Scoring Engine
 * 7-factor weighted scoring with grade calculation
 */
import type { AnalysisContext } from '@/types/strategy';
import type { StrategyResult } from '@/types/strategy';
import type { TradingSetup, SetupGrade } from '@/types/setup';
import type { ScoreBreakdown } from '@/config/scoring';
import {
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_SCORE_THRESHOLDS,
  FactorConfigSchema,
  calculateGrade,
  type ScoreThresholdsSchema,
} from '@/config/scoring';

export interface ScorerConfig {
  weights: typeof DEFAULT_SCORE_WEIGHTS;
  thresholds: ReturnType<typeof ScoreThresholdsSchema.parse>;
  factorConfig: ReturnType<typeof FactorConfigSchema.parse>;
}

export class ScoringEngine {
  private config: ScorerConfig;

  constructor(config: Partial<ScorerConfig> = {}) {
    this.config = {
      weights: config.weights ?? DEFAULT_SCORE_WEIGHTS,
      thresholds: config.thresholds ?? DEFAULT_SCORE_THRESHOLDS,
      factorConfig: config.factorConfig ?? FactorConfigSchema.parse({}),
    };
  }

  /**
   * Score a complete strategy result
   */
  score(context: AnalysisContext, result: StrategyResult): number {
    const setup = result.setup;
    if (!setup) return 0;

    const breakdown = this.calculateScoreBreakdown(context, setup);
    return breakdown.total;
  }

  /**
   * Calculate detailed score breakdown
   */
  calculateScoreBreakdown(context: AnalysisContext, setup: TradingSetup): ScoreBreakdown {
    // 1. Trend Score (20 points)
    const trend = this.scoreTrend(context, setup);

    // 2. Price Action Score (20 points)
    const priceAction = this.scorePriceAction(context, setup);

    // 3. Support/Resistance Score (15 points)
    const supportResistance = this.scoreSupportResistance(context, setup);

    // 4. Candlestick Score (15 points)
    const candlestick = this.scoreCandlestick(context, setup);

    // 5. Volume Score (10 points)
    const volume = this.scoreVolume(context, setup);

    // 6. Momentum Score (10 points)
    const momentum = this.scoreMomentum(context, setup);

    // 7. CPR Score (5 points)
    const cpr = this.scoreCPR(context, setup);

    // 8. Risk/Reward Score (5 points)
    const riskReward = this.scoreRiskReward(context, setup);

    // Calculate weighted total
    const weights = this.config.weights;
    const total =
      trend * (weights.trend / 20) +
      priceAction * (weights.priceAction / 20) +
      supportResistance * (weights.supportResistance / 15) +
      candlestick * (weights.candlestick / 15) +
      volume * (weights.volume / 10) +
      momentum * (weights.momentum / 10) +
      cpr * (weights.cpr / 5) +
      riskReward * (weights.riskReward / 5);

    const clampedTotal = Math.max(0, Math.min(100, Math.round(total)));
    const grade = calculateGrade(clampedTotal);

    return {
      trend: Math.round(trend),
      priceAction: Math.round(priceAction),
      supportResistance: Math.round(supportResistance),
      candlestick: Math.round(candlestick),
      volume: Math.round(volume),
      momentum: Math.round(momentum),
      cpr: Math.round(cpr),
      riskReward: Math.round(riskReward),
      total: clampedTotal,
      grade,
    };
  }

  /**
   * Score Trend factor (max 20)
   */
  private scoreTrend(context: AnalysisContext, _setup: TradingSetup): number {
    const factor = this.config.factorConfig.trend;
    let score = 0;

    const htfEma = context.indicators.higher.ema;
    const setupEma = context.indicators.setup.ema;
    const entryEma = context.indicators.entry.ema;

    const htfBullish = htfEma.ema20 > htfEma.ema50 && htfEma.ema50 > htfEma.ema200;
    const htfBearish = htfEma.ema20 < htfEma.ema50 && htfEma.ema50 < htfEma.ema200;
    const setupBullish = setupEma.ema20 > setupEma.ema50 && setupEma.ema50 > setupEma.ema200;
    const entryBullish = entryEma.ema20 > entryEma.ema50 && entryEma.ema50 > entryEma.ema200;

    // Higher timeframe trend
    if (htfBullish) score += factor.htfBullish;
    else if (htfBearish) score += factor.htfBearish;
    else score += factor.htfNeutral;

    // Setup timeframe alignment
    if (setupBullish) score += factor.setupTimeframeAligned;

    // Entry timeframe alignment
    if (entryBullish) score += factor.entryTimeframeAligned;

    return Math.min(20, Math.max(0, score));
  }

  /**
   * Score Price Action factor (max 20)
   */
  private scorePriceAction(context: AnalysisContext, _setup: TradingSetup): number {
    const factor = this.config.factorConfig.priceAction;
    let score = 0;

    const structure = context.priceAction.setup.structure;

    // Structure type
    switch (structure.type) {
      case 'HH_HL':
        score += factor.bullishStructure;
        break;
      case 'LH_LL':
        score += factor.bearishStructure;
        break;
      case 'RANGING':
        score += factor.ranging;
        break;
    }

    // BOS/CHoCH
    if (structure.bosDetected) score += factor.bosConfirmed;
    if (structure.chochDetected) score += factor.chochConfirmed;

    return Math.min(20, Math.max(0, score));
  }

  /**
   * Score Support/Resistance factor (max 15)
   */
  private scoreSupportResistance(context: AnalysisContext, setup: TradingSetup): number {
    const factor = this.config.factorConfig.supportResistance;
    let score = 0;

    const supportZones = context.priceAction.setup.supportZones;
    const resistanceZones = context.priceAction.setup.resistanceZones;
    const currentPrice = context.currentPrice;

    // Find nearest zones
    const nearestSupport = supportZones
      .filter((z) => z.center < currentPrice)
      .sort((a, b) => b.center - a.center)[0];

    const nearestResistance = resistanceZones
      .filter((z) => z.center > currentPrice)
      .sort((a, b) => a.center - b.center)[0];

    // For LONG setups
    if (setup.direction === 'LONG') {
      if (nearestSupport) {
        const distPct = ((currentPrice - nearestSupport.center) / currentPrice) * 100;
        if (distPct < 1) score += factor.atStrongSupport;
        else if (distPct < 3) score += factor.nearSupport;

        // Strength bonus
        if (nearestSupport.strength > 70) score += factor.zoneStrengthBonus;
        if (nearestSupport.touches >= 3) score += factor.multipleTouches;
      }

      // Penalty for being near resistance
      if (nearestResistance) {
        const distPct = ((nearestResistance.center - currentPrice) / currentPrice) * 100;
        if (distPct < 3)
          score += factor.nearResistance; // Slight penalty area
        else if (distPct < 1) score += factor.atStrongResistance; // At resistance
      }
    }

    return Math.min(15, Math.max(0, score));
  }

  /**
   * Score Candlestick factor (max 15)
   */
  private scoreCandlestick(context: AnalysisContext, setup: TradingSetup): number {
    const factor = this.config.factorConfig.candlestick;
    let score = 0;

    const patterns = context.patterns.setup;

    // Find strongest bullish/bearish pattern
    const bullishPatterns = patterns.filter((p) => p.direction === 'BULLISH');
    const bearishPatterns = patterns.filter((p) => p.direction === 'BEARISH');
    const neutralPatterns = patterns.filter((p) => p.direction === 'NEUTRAL');

    if (setup.direction === 'LONG') {
      if (bullishPatterns.length > 0) {
        const bestPattern = bullishPatterns.reduce((a, b) => (a.totalScore > b.totalScore ? a : b));
        if (bestPattern.totalScore >= 80) score += factor.bullishPatternConfirmed;
        else if (bestPattern.totalScore >= 50) score += factor.bullishPatternWeak;
      }
    } else {
      if (bearishPatterns.length > 0) {
        const bestPattern = bearishPatterns.reduce((a, b) => (a.totalScore > b.totalScore ? a : b));
        if (bestPattern.totalScore >= 50) score += factor.bearishPattern;
      }
    }

    // Doji at key level
    const doji = neutralPatterns.find((p) => p.type === 'DOJI');
    if (doji && doji.totalScore > 60) {
      score += factor.dojiAtKeyLevel;
    }

    // Volume confirmation on pattern
    const setupVolume = context.indicators.setup.volume;
    if (
      setupVolume.relativeVolume >= 1.5 &&
      (bullishPatterns.length > 0 || bearishPatterns.length > 0)
    ) {
      score += factor.volumeConfirmation;
    }

    return Math.min(15, Math.max(-10, score)); // Can be negative for bearish patterns
  }

  /**
   * Score Volume factor (max 10)
   */
  private scoreVolume(context: AnalysisContext, _setup: TradingSetup): number {
    const factor = this.config.factorConfig.volume;
    const volume = context.indicators.setup.volume;
    const relVol = volume.relativeVolume;

    if (relVol >= 2.5) return factor.highVolumeBreakout;
    if (relVol >= 1.5) return factor.aboveAverage;
    if (relVol >= 1.0) return factor.average;
    if (relVol >= 0.7) return factor.belowAverage;
    return factor.belowAverage;
  }

  /**
   * Score Momentum factor (max 10)
   */
  private scoreMomentum(context: AnalysisContext, _setup: TradingSetup): number {
    const factor = this.config.factorConfig.momentum;
    let score = 0;

    const rsi = context.indicators.setup.rsi.rsi;
    const macd = context.indicators.setup.macd;
    const adx = context.indicators.setup.adx;

    // RSI
    if (rsi >= 50 && rsi <= 70) score += factor.rsiBullish;
    else if (rsi > 30 && rsi < 50) score += factor.rsiNeutral;
    else if (rsi > 75) score += factor.rsiOverbought;

    // MACD
    if (macd.trend === 'BULLISH') score += factor.macdBullish;

    // ADX
    if (adx.trendStrength === 'STRONG' && adx.trendDirection === 'BULLISH') {
      score += factor.adxStrong;
    }

    return Math.min(10, Math.max(-5, score));
  }

  /**
   * Score CPR factor (max 5)
   */
  private scoreCPR(context: AnalysisContext, _setup: TradingSetup): number {
    const factor = this.config.factorConfig.cpr;
    let score = 0;

    const cpr = context.cpr.setup;
    if (!cpr) return 0;

    switch (cpr.position) {
      case 'ABOVE':
        score += factor.priceAboveTC;
        break;
      case 'AT_TC':
        score += factor.priceAtPivot;
        break;
      case 'AT_BC':
        score += factor.priceAtBC;
        break;
      case 'INSIDE':
        score += factor.priceAtPivot;
        break;
      case 'BELOW':
        score += factor.priceBelowBC;
        break;
    }

    if (cpr.cpr.classification === 'NARROW') {
      score += factor.narrowCPR;
    }

    return Math.min(5, Math.max(0, score));
  }

  /**
   * Score Risk/Reward factor (max 5)
   */
  private scoreRiskReward(_context: AnalysisContext, setup: TradingSetup): number {
    const factor = this.config.factorConfig.riskReward;
    const rr = setup.riskReward;

    if (rr >= 3) return factor.rrAbove3;
    if (rr >= 2) return factor.rr2To3;
    if (rr >= 1.5) return factor.rr1_5To2;
    if (rr >= 1) return factor.rr1To1_5;
    return factor.rrBelow1;
  }

  /**
   * Calculate grade from score
   */
  calculateGrade(score: number): SetupGrade {
    return calculateGrade(score);
  }

  /**
   * Get scoring configuration
   */
  getConfig(): ScorerConfig {
    return this.config;
  }
}

/**
 * Create a scoring engine with default configuration
 */
export function createScoringEngine(config?: Partial<ScorerConfig>): ScoringEngine {
  return new ScoringEngine(config);
}
