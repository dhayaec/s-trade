/**
 * Reversal Strategy (Conservative)
 * Detects reversal setups: downtrend + divergence + structure break + confirmation
 */
import type {
  AnalysisContext,
  StrategyResult,
  StrategyConfig,
  StrategySignal,
} from '@/types/strategy';
import { BaseStrategy } from './base';
import type { CandlestickPattern } from '@/types/candlesticks';
import type { Confirmation, TradingSetup } from '@/types/setup';
import type { MarketStructure, PriceZone } from '@/types/price-action';

export class ReversalStrategy extends BaseStrategy {
  override readonly name = 'REVERSAL' as const;

  constructor(config: StrategyConfig) {
    super('REVERSAL', config);
  }

  override analyze(context: AnalysisContext): StrategyResult | null {
    // Early return for incomplete context
    if (!context.indicators || !context.priceAction || !context.patterns || !context.cpr) {
      return null;
    }

    const { config } = this;

    // 1. Check higher timeframe - must be bearish for bullish reversal
    // (we only trade bullish reversals for long setups)
    const htfBearish = this.isHigherTimeframeBearish(context);
    if (!htfBearish) {
      return null;
    }

    // 2. Check RSI for divergence (oversold)
    const rsi = context.indicators.setup.rsi.rsi;
    if (rsi > 50) {
      return null; // Not oversold enough
    }

    // 3. Check volume condition
    if (!this.checkVolume(context, 'setup')) {
      return null;
    }

    // 4. Find strong support zones
    const supportZones = context.priceAction.setup.supportZones;
    const currentPrice = context.currentPrice;
    const nearestSupport = this.isNearSupport(currentPrice, supportZones, 2.0);
    if (!nearestSupport.zone) {
      return null;
    }
    const supportZone = nearestSupport.zone;

    // 5. Check for structure break (BOS/CHoCH)
    const structure = context.priceAction.setup.structure;
    if (!structure.bosDetected && !structure.chochDetected) {
      return null;
    }

    // 6. Check for bullish candlestick confirmation (required, high confidence)
    const bullishPattern = this.hasBullishCandlestick(
      context.patterns.setup,
      config.minCandlestickScore ?? 70
    );
    if (!bullishPattern) {
      return null;
    }

    // 7. Check CPR alignment (if required)
    if (config.cprAlignmentRequired) {
      const cprAlignment = context.cpr.setup?.alignment;
      if (cprAlignment !== 'BULLISH' && cprAlignment !== 'NEUTRAL') {
        return null;
      }
    }

    // 8. Calculate entry, stop loss, and targets
    const entryPrice = this.calculateEntryPrice(supportZone, bullishPattern, context);
    const stopLoss = this.calculateStopLoss(supportZone, context);
    const targets = this.calculateTargets(entryPrice, stopLoss);

    // 9. Validate risk/reward (higher threshold for reversals)
    const riskReward = this.calculateRiskReward(entryPrice, stopLoss, targets[0] ?? 0);
    if (riskReward < config.minRiskReward) {
      return null;
    }

    // 10. Build confirmations
    const confirmations = this.buildConfirmations(
      context,
      supportZone,
      bullishPattern,
      riskReward,
      structure
    );

    // 11. Build invalidations
    const invalidations = this.buildInvalidations(supportZone, context, structure);

    // 12. Create setup object
    const setup = this.createSetup(
      context,
      entryPrice,
      stopLoss,
      targets,
      riskReward,
      confirmations,
      invalidations,
      supportZone,
      bullishPattern,
      structure
    );

    return {
      setup,
      signals: this.generateSignals(context, supportZone, bullishPattern, structure),
      metadata: {
        supportZone: {
          lower: supportZone.lower,
          upper: supportZone.upper,
          strength: supportZone.strength,
          sources: supportZone.sources,
        },
        structureBreak: {
          bosDetected: structure.bosDetected,
          chochDetected: structure.chochDetected,
          bosLevel: structure.bosLevel,
          chochLevel: structure.chochLevel,
        },
        distanceToSupport: nearestSupport.distance,
      },
    };
  }

  /**
   * Calculate entry price - above reversal confirmation candle high
   */
  private calculateEntryPrice(
    _zone: PriceZone,
    pattern: CandlestickPattern,
    context: AnalysisContext
  ): number {
    const setupCandles = context.candles.setup;
    const patternIdx = pattern.candleIndexes[0];

    if (patternIdx !== undefined && patternIdx < setupCandles.length) {
      const candle = setupCandles[patternIdx];
      if (candle) {
        return candle.high; // Entry above pattern high
      }
    }

    return context.currentPrice * 1.001;
  }

  /**
   * Calculate stop loss - below support zone
   */
  private calculateStopLoss(zone: PriceZone, context: AnalysisContext): number {
    const atr = context.indicators.setup.atr.atr;
    const { atrMultiplier } = this.config;

    // Below support zone
    const zoneStop = zone.lower - (zone.upper - zone.lower) * 0.15;

    // ATR-based (wider for reversals)
    const entry = context.currentPrice * 1.001;
    const atrStop = entry - atr * (atrMultiplier ?? 1.5);

    return Math.min(zoneStop, atrStop);
  }

  /**
   * Calculate targets - R-based
   */
  private calculateTargets(entry: number, stopLoss: number): number[] {
    const risk = entry - stopLoss;
    if (risk <= 0) return [];

    // Reversals can have bigger targets
    return [
      entry + risk * 1, // Target 1: 1R
      entry + risk * 2.5, // Target 2: 2.5R
      entry + risk * 4, // Target 3: 4R
    ];
  }

  /**
   * Calculate risk/reward ratio
   */
  private calculateRiskReward(entry: number, stopLoss: number, target1: number): number {
    const risk = entry - stopLoss;
    const reward = target1 - entry;
    return risk > 0 ? reward / risk : 0;
  }

  /**
   * Build confirmations list
   */
  private buildConfirmations(
    context: AnalysisContext,
    zone: PriceZone,
    pattern: CandlestickPattern,
    riskReward: number,
    structure: MarketStructure
  ): Confirmation[] {
    const confirmations: Confirmation[] = [];

    // Oversold RSI
    const rsi = context.indicators.setup.rsi.rsi;
    confirmations.push({
      factor: 'Oversold RSI',
      description: `RSI at ${rsi.toFixed(1)} - oversold reversal potential`,
      weight: 15,
      met: true,
    });

    // RSI Divergence check
    if (this.checkRSIDivergence(context)) {
      confirmations.push({
        factor: 'RSI Divergence',
        description: 'Bullish RSI divergence detected',
        weight: 20,
        met: true,
      });
    }

    // Structure break
    if (structure.chochDetected) {
      confirmations.push({
        factor: 'Change of Character',
        description: 'Downtrend structure broken (CHoCH)',
        weight: 20,
        met: true,
      });
    } else if (structure.bosDetected) {
      confirmations.push({
        factor: 'Break of Structure',
        description: 'Resistance broken in downtrend (BOS)',
        weight: 15,
        met: true,
      });
    }

    // Strong support zone
    confirmations.push({
      factor: 'Strong Support',
      description: `Price at support zone (strength: ${zone.strength}/100)`,
      weight: 15,
      met: true,
    });

    // Bullish candlestick
    confirmations.push({
      factor: 'Reversal Candle',
      description: `${pattern.name} at support (${pattern.totalScore}/100)`,
      weight: 20,
      met: true,
    });

    // Volume spike
    const volume = context.indicators.setup.volume;
    if (volume.relativeVolume >= 2.0) {
      confirmations.push({
        factor: 'Volume Spike',
        description: `Reversal volume ${volume.relativeVolume.toFixed(1)}x average`,
        weight: 10,
        met: true,
      });
    }

    // MACD bullish divergence or crossover
    const macd = context.indicators.setup.macd;
    if (macd.trend === 'BULLISH') {
      confirmations.push({
        factor: 'MACD Bullish',
        description: 'MACD showing bullish momentum shift',
        weight: 10,
        met: true,
      });
    }

    // CPR alignment
    const cpr = context.cpr.setup;
    if (cpr && cpr.alignment === 'BULLISH') {
      confirmations.push({
        factor: 'CPR Alignment',
        description: `CPR bullish alignment`,
        weight: 5,
        met: true,
      });
    }

    // Risk/Reward
    if (riskReward >= 2) {
      confirmations.push({
        factor: 'Risk/Reward',
        description: `R:R ratio ${riskReward.toFixed(1)}:1`,
        weight: 5,
        met: true,
      });
    }

    return confirmations;
  }

  /**
   * Check for RSI divergence
   */
  private checkRSIDivergence(context: AnalysisContext): boolean {
    const setupRSI = context.indicators.setup.rsi.rsi;
    const entryRSI = context.indicators.entry.rsi.rsi;

    // Simplified: if setup RSI is higher than entry RSI while price made lower low
    // In a real implementation, would compare swing points
    return setupRSI > entryRSI + 5;
  }

  /**
   * Build invalidations list
   */
  private buildInvalidations(
    zone: PriceZone,
    context: AnalysisContext,
    structure: MarketStructure
  ): string[] {
    const invalidations = [];

    invalidations.push(`Daily close below ${zone.lower.toFixed(2)} invalidates support`);
    invalidations.push(`Close below stop loss invalidates setup`);

    if (structure.bosLevel) {
      invalidations.push(`Price falls below BOS level at ${structure.bosLevel.toFixed(2)}`);
    }

    // Higher timeframe still bearish
    const htfEMA = context.indicators.higher.ema;
    if (htfEMA.ema20 < htfEMA.ema50) {
      invalidations.push('Daily trend remains bearish - reversal may fail');
    }

    return invalidations;
  }

  /**
   * Create the trading setup object
   */
  private createSetup(
    context: AnalysisContext,
    entry: number,
    stopLoss: number,
    targets: number[],
    riskReward: number,
    confirmations: Confirmation[],
    invalidations: string[],
    zone: PriceZone,
    pattern: CandlestickPattern,
    structure: MarketStructure
  ): TradingSetup {
    const riskPerShare = entry - stopLoss;
    const rewardPerShare = (targets[0] ?? 0) - entry;

    const scoreBreakdown = {
      trend: 5, // HTF is bearish
      priceAction: structure.chochDetected ? 18 : 12,
      supportResistance: Math.min(15, zone.strength * 0.15 + 5),
      candlestick: Math.min(15, pattern.totalScore * 0.15),
      volume: Math.min(10, context.indicators.setup.volume.relativeVolume * 5),
      momentum: context.indicators.setup.rsi.rsi < 30 ? 10 : 5,
      cpr: context.cpr.setup?.alignment === 'BULLISH' ? 5 : 0,
      riskReward: Math.min(5, riskReward * 2),
      total: 0,
    };
    scoreBreakdown.total =
      Object.values(scoreBreakdown).reduce((a: number, b: number) => a + b, 0) -
      scoreBreakdown.total;

    return {
      symbol: context.symbol,
      timeframe: '4H',
      generatedAt: Date.now(),
      direction: 'LONG',
      setupType: 'REVERSAL',
      entry,
      stopLoss,
      targets,
      riskPerShare,
      rewardPerShare,
      riskReward,
      confidenceScore: scoreBreakdown.total,
      scoreBreakdown,
      grade: this.calculateGrade(scoreBreakdown.total),
      trendScore: scoreBreakdown.trend,
      momentumScore: scoreBreakdown.momentum,
      volumeScore: scoreBreakdown.volume,
      priceActionScore: scoreBreakdown.priceAction,
      candlestickScore: scoreBreakdown.candlestick,
      indicatorScore: scoreBreakdown.cpr + scoreBreakdown.momentum,
      confirmations,
      invalidations: invalidations.map((c, i) => ({
        condition: c,
        description: c,
        severity: i === 0 ? 'CRITICAL' : 'WARNING',
      })),
      marketRegime: context.marketRegime,
      trend: {
        direction: 'BEARISH' as const,
        strength: 40,
        emaAlignment: 'BEARISH' as const,
        structure: structure.chochDetected ? 'MIXED' : 'LH_LL',
        adxValue: context.indicators.setup.adx.adx,
      },
      explanation: this.generateExplanation(context, zone, pattern, riskReward, structure),
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    context: AnalysisContext,
    zone: PriceZone,
    pattern: CandlestickPattern,
    riskReward: number,
    structure: MarketStructure
  ): string {
    const parts: string[] = [];

    parts.push(`Why this setup?`);
    parts.push(``);

    // RSI
    const rsi = context.indicators.setup.rsi.rsi;
    parts.push(`✓ RSI oversold at ${rsi.toFixed(1)} - reversal potential`);

    // Divergence
    if (this.checkRSIDivergence(context)) {
      parts.push(`✓ Bullish RSI divergence - price lower low, RSI higher low`);
    }

    // Structure
    if (structure.chochDetected) {
      parts.push(`✓ Change of Character (CHoCH) - downtrend structure broken`);
    } else if (structure.bosDetected) {
      parts.push(`✓ Break of Structure (BOS) - resistance broken in downtrend`);
    }

    // Support
    parts.push(`✓ Price at strong support zone (${zone.strength}/100)`);
    parts.push(`✓ Support from: ${zone.sources.join(', ')}`);

    // Pattern
    parts.push(`✓ ${pattern.name} at support (${pattern.totalScore}/100)`);

    // Volume
    const volume = context.indicators.setup.volume;
    if (volume.relativeVolume >= 2.0) {
      parts.push(`✓ Reversal volume ${volume.relativeVolume.toFixed(1)}x average`);
    }

    // MACD
    const macd = context.indicators.setup.macd;
    if (macd.trend === 'BULLISH') {
      parts.push(`✓ MACD bullish - momentum shifting`);
    }

    // CPR
    const cpr = context.cpr.setup;
    if (cpr && cpr.alignment === 'BULLISH') {
      parts.push(`✓ CPR supportive`);
    }

    parts.push(`✓ Risk/reward is ${riskReward.toFixed(1)}:1`);

    parts.push(``);
    parts.push(`Risk factors:`);
    parts.push(`⚠ Trading against daily trend - higher risk`);
    parts.push(`⚠ Reversal could fail - downtrend may resume`);
    parts.push(`⚠ Position size should be reduced for counter-trend trades`);

    parts.push(``);
    parts.push(`Invalidation:`);
    parts.push(`Daily close below ${zone.lower.toFixed(2)}`);

    return parts.join('\n');
  }

  /**
   * Generate strategy signals
   */
  private generateSignals(
    context: AnalysisContext,
    zone: PriceZone,
    pattern: CandlestickPattern,
    structure: MarketStructure
  ): StrategySignal[] {
    const signals: StrategySignal[] = [];

    const entry = this.calculateEntryPrice(zone, pattern, context);
    signals.push({
      type: 'ENTRY',
      message: `Reversal entry at ${entry.toFixed(2)}`,
      strength: pattern.totalScore,
      timestamp: context.currentTimestamp,
    });

    if (structure.chochDetected) {
      signals.push({
        type: 'INFO',
        message: 'Change of Character (CHoCH) detected',
        strength: 85,
        timestamp: context.currentTimestamp,
      });
    } else if (structure.bosDetected) {
      signals.push({
        type: 'INFO',
        message: 'Break of Structure (BOS) detected',
        strength: 80,
        timestamp: context.currentTimestamp,
      });
    }

    signals.push({
      type: 'WARNING',
      message: 'Counter-trend trade - reduce position size',
      strength: 60,
      timestamp: context.currentTimestamp,
    });

    return signals;
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'WEAK' | 'REJECT' {
    if (score >= 80) return 'EXCELLENT';
    if (score >= 70) return 'STRONG';
    if (score >= 60) return 'MODERATE';
    if (score >= 50) return 'WEAK';
    return 'REJECT';
  }

  override getRequiredIndicators(): string[] {
    return ['ema', 'rsi', 'macd', 'atr', 'adx', 'volume', 'prevLevels'];
  }

  override getRequiredPriceAction(): string[] {
    return ['structure', 'supportZones', 'resistanceZones', 'breakouts', 'pullbacks'];
  }
}
