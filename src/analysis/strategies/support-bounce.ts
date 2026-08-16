/**
 * Support Bounce Strategy
 * Detects support bounce setups: strong support + rejection + momentum
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
import type { PriceZone } from '@/types/price-action';

export class SupportBounceStrategy extends BaseStrategy {
  override readonly name = 'SUPPORT_BOUNCE' as const;

  constructor(config: StrategyConfig) {
    super('SUPPORT_BOUNCE', config);
  }

  override analyze(context: AnalysisContext): StrategyResult | null {
    // Early return for incomplete context
    if (!context.indicators || !context.priceAction || !context.patterns || !context.cpr) {
      return null;
    }

    const { config } = this;

    // 1. Check higher timeframe trend (if required)
    if (config.requireHTFAlignment) {
      // Support bounce can work in any HTF trend if at strong support
      // but prefer bullish or neutral
      const htfBullish = this.isHigherTimeframeBullish(context);
      const htfBearish = this.isHigherTimeframeBearish(context);
      if (htfBearish && !htfBullish) {
        return null; // Don't bounce in strong downtrend
      }
    }

    // 2. Check RSI condition (prefer oversold)
    if (!this.checkRSI(context, 'setup')) {
      return null;
    }

    // 3. Check volume condition
    if (!this.checkVolume(context, 'setup')) {
      return null;
    }

    // 4. Find strong support zones near current price
    const supportZones = context.priceAction.setup.supportZones;
    const currentPrice = context.currentPrice;
    const nearestSupport = this.isNearSupport(currentPrice, supportZones, 2.0);
    if (!nearestSupport.zone) {
      return null;
    }

    const supportZone = nearestSupport.zone;

    // 5. Check if price is at/near support
    if (nearestSupport.distance > 2.0) {
      return null;
    }

    // 6. Check for bullish candlestick confirmation (required)
    const bullishPattern = this.hasBullishCandlestick(
      context.patterns.setup,
      config.minCandlestickScore ?? 60
    );
    if (!bullishPattern) {
      return null;
    }

    // 7. Check CPR alignment (if required)
    if (config.cprAlignmentRequired) {
      const cprAlignment = context.cpr.setup?.alignment;
      if (cprAlignment === 'BEARISH') {
        return null;
      }
    }

    // 8. Calculate entry, stop loss, and targets
    const entryPrice = this.calculateEntryPrice(supportZone, bullishPattern, context);
    const stopLoss = this.calculateStopLoss(supportZone, context);
    const targets = this.calculateTargets(entryPrice, stopLoss);

    // 9. Validate risk/reward
    const riskReward = this.calculateRiskReward(entryPrice, stopLoss, targets[0] ?? 0);
    if (riskReward < config.minRiskReward) {
      return null;
    }

    // 10. Build confirmations
    const confirmations = this.buildConfirmations(context, supportZone, bullishPattern, riskReward);

    // 11. Build invalidations
    const invalidations = this.buildInvalidations(supportZone, context);

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
      bullishPattern
    );

    return {
      setup,
      signals: this.generateSignals(context, supportZone, bullishPattern),
      metadata: {
        supportZone: {
          lower: supportZone.lower,
          upper: supportZone.upper,
          strength: supportZone.strength,
          sources: supportZone.sources,
        },
        distanceToSupport: nearestSupport.distance,
      },
    };
  }

  /**
   * Calculate entry price - above rejection candle high
   */
  private calculateEntryPrice(
    _zone: PriceZone,
    pattern: CandlestickPattern,
    context: AnalysisContext
  ): number {
    // Find the pattern candle index
    const setupCandles = context.candles.setup;
    const patternIdx = pattern.candleIndexes[0];

    if (patternIdx !== undefined && patternIdx < setupCandles.length) {
      const candle = setupCandles[patternIdx];
      if (candle) {
        return candle.high; // Entry above pattern high
      }
    }

    // Fallback: current price + small buffer
    return context.currentPrice * 1.001;
  }

  /**
   * Calculate stop loss - below support zone
   */
  private calculateStopLoss(zone: PriceZone, context: AnalysisContext): number {
    const atr = context.indicators.setup.atr.atr;
    const { atrMultiplier } = this.config;

    // Option 1: Below support zone
    const zoneStop = zone.lower - (zone.upper - zone.lower) * 0.1;

    // Option 2: ATR-based from entry
    const entry = context.currentPrice * 1.001;
    const atrStop = entry - atr * (atrMultiplier ?? 1.0);

    // Use the tighter stop (lower)
    return Math.min(zoneStop, atrStop);
  }

  /**
   * Calculate targets - R-based
   */
  private calculateTargets(entry: number, stopLoss: number): number[] {
    const risk = entry - stopLoss;
    if (risk <= 0) return [];

    // Support bounce often has larger targets
    return [
      entry + risk * 1, // Target 1: 1R
      entry + risk * 2, // Target 2: 2R
      entry + risk * 3, // Target 3: 3R
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
    riskReward: number
  ): Confirmation[] {
    const confirmations: Confirmation[] = [];

    // Strong support zone
    confirmations.push({
      factor: 'Strong Support',
      description: `Price at support zone (strength: ${zone.strength}/100, sources: ${zone.sources.join(', ')})`,
      weight: 20,
      met: true,
    });

    // Support sources diversity
    if (zone.sources.length >= 2) {
      confirmations.push({
        factor: 'Multiple Support Sources',
        description: `Support confirmed by ${zone.sources.length} sources`,
        weight: 10,
        met: true,
      });
    }

    // Bullish candlestick
    confirmations.push({
      factor: 'Candlestick Rejection',
      description: `${pattern.name} at support (${pattern.totalScore}/100)`,
      weight: 15,
      met: true,
    });

    // RSI oversold bounce
    const rsi = context.indicators.setup.rsi.rsi;
    if (rsi < 40) {
      confirmations.push({
        factor: 'Oversold RSI',
        description: `RSI at ${rsi.toFixed(1)} - oversold bounce potential`,
        weight: 10,
        met: true,
      });
    } else if (rsi > 50) {
      confirmations.push({
        factor: 'RSI Bullish',
        description: `RSI at ${rsi.toFixed(1)} - momentum turning bullish`,
        weight: 8,
        met: true,
      });
    }

    // Volume spike on rejection
    const volume = context.indicators.setup.volume;
    if (volume.relativeVolume >= 1.5) {
      confirmations.push({
        factor: 'Volume Confirmation',
        description: `Rejection volume ${volume.relativeVolume.toFixed(1)}x average`,
        weight: 10,
        met: true,
      });
    }

    // MACD bullish
    const macd = context.indicators.setup.macd;
    if (macd.trend === 'BULLISH') {
      confirmations.push({
        factor: 'MACD Bullish',
        description: 'MACD showing bullish momentum',
        weight: 5,
        met: true,
      });
    }

    // CPR alignment
    const cpr = context.cpr.setup;
    if (
      cpr &&
      (cpr.alignment === 'BULLISH' || cpr.position === 'AT_BC' || cpr.position === 'AT_TC')
    ) {
      confirmations.push({
        factor: 'CPR Alignment',
        description: `Price at CPR ${cpr.position}, alignment: ${cpr.alignment}`,
        weight: 5,
        met: true,
      });
    }

    // HTF trend
    if (this.isHigherTimeframeBullish(context)) {
      confirmations.push({
        factor: 'HTF Trend Support',
        description: 'Daily trend is bullish - aligns with bounce',
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
   * Build invalidations list
   */
  private buildInvalidations(zone: PriceZone, context: AnalysisContext): string[] {
    const invalidations = [];

    invalidations.push(`Daily close below ${zone.lower.toFixed(2)} invalidates support`);
    invalidations.push(`Close below stop loss invalidates setup`);
    invalidations.push(`Support zone broken with volume confirms breakdown`);

    const htfEMA = context.indicators.higher.ema;
    if (htfEMA.ema20 < htfEMA.ema50) {
      invalidations.push('Daily EMA 20 crosses below EMA 50 - trend turning bearish');
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
    pattern: CandlestickPattern
  ): TradingSetup {
    const riskPerShare = entry - stopLoss;
    const rewardPerShare = (targets[0] ?? 0) - entry;

    const scoreBreakdown = {
      trend: this.isHigherTimeframeBullish(context) ? 15 : 5,
      priceAction: 12,
      supportResistance: Math.min(15, zone.strength * 0.15 + 5),
      candlestick: Math.min(15, pattern.totalScore * 0.15),
      volume: Math.min(10, context.indicators.setup.volume.relativeVolume * 5),
      momentum: context.indicators.setup.rsi.rsi < 40 ? 10 : 5,
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
      setupType: 'SUPPORT_BOUNCE',
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
        direction: this.isHigherTimeframeBullish(context) ? 'BULLISH' : 'NEUTRAL',
        strength: this.isHigherTimeframeBullish(context) ? 60 : 40,
        emaAlignment: this.isHigherTimeframeBullish(context) ? 'BULLISH' : 'MIXED',
        structure: 'HH_HL' as const,
        adxValue: context.indicators.setup.adx.adx,
      },
      explanation: this.generateExplanation(context, zone, pattern, riskReward),
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    context: AnalysisContext,
    zone: PriceZone,
    pattern: CandlestickPattern,
    riskReward: number
  ): string {
    const parts: string[] = [];

    parts.push(`Why this setup?`);
    parts.push(``);

    // Support zone
    parts.push(`✓ Price at strong support zone (${zone.strength}/100)`);
    parts.push(`✓ Support from: ${zone.sources.join(', ')}`);

    // Pattern
    parts.push(`✓ ${pattern.name} rejection at support (${pattern.totalScore}/100)`);

    // RSI
    const rsi = context.indicators.setup.rsi.rsi;
    if (rsi < 40) {
      parts.push(`✓ RSI oversold at ${rsi.toFixed(1)} - bounce potential`);
    }

    // Volume
    const volume = context.indicators.setup.volume;
    if (volume.relativeVolume >= 1.5) {
      parts.push(`✓ Rejection volume ${volume.relativeVolume.toFixed(1)}x average`);
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
    parts.push(`⚠ Support could break - strong breakdown possible`);
    parts.push(`⚠ Market-wide trend could invalidate setup`);

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
    pattern: CandlestickPattern
  ): StrategySignal[] {
    const signals: StrategySignal[] = [];

    const entry = this.calculateEntryPrice(zone, pattern, context);
    signals.push({
      type: 'ENTRY',
      message: `Support bounce entry at ${entry.toFixed(2)}`,
      strength: pattern.totalScore,
      timestamp: context.currentTimestamp,
    });

    signals.push({
      type: 'INFO',
      message: `${pattern.name} at support (${pattern.totalScore}/100)`,
      strength: pattern.totalScore,
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
    return ['structure', 'supportZones', 'pullbacks', 'consolidation'];
  }
}
