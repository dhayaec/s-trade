/**
 * Pullback Strategy
 * Detects pullback setups: uptrend + pullback to support/EMA + bullish candle
 */
import type {
  AnalysisContext,
  StrategyResult,
  StrategyConfig,
  StrategySignal,
} from '@/types/strategy';
import { BaseStrategy } from './base';
import type { Pullback } from '@/types/price-action';
import type { CandlestickPattern } from '@/types/candlesticks';
import type { Confirmation, TradingSetup } from '@/types/setup';

export class PullbackStrategy extends BaseStrategy {
  override readonly name = 'PULLBACK' as const;

  constructor(config: StrategyConfig) {
    super('PULLBACK', config);
  }

  override analyze(context: AnalysisContext): StrategyResult | null {
    // Early return for incomplete context
    if (!context.indicators || !context.priceAction || !context.patterns || !context.cpr) {
      return null;
    }

    const { config } = this;

    // 1. Validate higher timeframe trend alignment (if required)
    if (config.requireHTFAlignment && !this.isHigherTimeframeBullish(context)) {
      return null;
    }

    // 2. Check setup timeframe trend
    if (config.requireEmaAlignment && !this.checkEMAAlignment(context, 'setup')) {
      return null;
    }

    // 3. Check RSI condition
    if (!this.checkRSI(context, 'setup')) {
      return null;
    }

    // 4. Check volume condition
    if (!this.checkVolume(context, 'setup')) {
      return null;
    }

    // 5. Find active pullbacks in setup timeframe
    const pullbacks = context.priceAction.setup.pullbacks;
    if (pullbacks.length === 0) {
      return null;
    }

    // 6. Get the most recent valid pullback
    const activePullback = this.getValidPullback(pullbacks);
    if (!activePullback) {
      return null;
    }

    // 7. Check structure confirmation (if required)
    if (config.requireStructureConfirmation) {
      const structure = context.priceAction.setup.structure;
      if (structure.currentTrend !== 'BULLISH' || structure.type !== 'HH_HL') {
        return null;
      }
    }

    // 8. Check for bullish candlestick confirmation (if required)
    let bullishPattern: CandlestickPattern | null = null;
    if (config.requireCandlestickConfirmation) {
      bullishPattern = this.hasBullishCandlestick(
        context.patterns.setup,
        config.minCandlestickScore ?? 50
      );
      if (!bullishPattern) {
        return null;
      }
    }

    // 9. Check CPR alignment (if required)
    if (config.cprAlignmentRequired) {
      const cprAlignment = context.cpr.setup?.alignment;
      if (cprAlignment !== 'BULLISH' && cprAlignment !== 'NEUTRAL') {
        return null;
      }
    }

    // 10. Calculate entry, stop loss, and targets
    const entryPrice = this.calculateEntryPrice(activePullback, context);
    const stopLoss = this.calculateStopLoss(activePullback, context);
    const targets = this.calculateTargets(entryPrice, stopLoss);

    // 11. Validate risk/reward
    const riskReward = this.calculateRiskReward(entryPrice, stopLoss, targets[0] ?? 0);
    if (riskReward < config.minRiskReward) {
      return null;
    }

    // 12. Build confirmations
    const confirmations = this.buildConfirmations(
      context,
      activePullback,
      bullishPattern,
      riskReward
    );

    // 13. Build invalidations
    const invalidations = this.buildInvalidations(activePullback, context);

    // 14. Create setup object
    const setup = this.createSetup(
      context,
      entryPrice,
      stopLoss,
      targets,
      riskReward,
      confirmations,
      invalidations,
      activePullback,
      bullishPattern
    );

    return {
      setup,
      signals: this.generateSignals(context, activePullback, bullishPattern),
      metadata: {
        pullbackDepth: activePullback.depth,
        pullbackDepthCategory: activePullback.depthCategory,
        pullbackStrength: activePullback.strength,
        emaTouched: activePullback.emaTouched,
        supportZone: activePullback.supportZone
          ? {
              lower: activePullback.supportZone.lower,
              upper: activePullback.supportZone.upper,
              strength: activePullback.supportZone.strength,
            }
          : null,
      },
    };
  }

  /**
   * Get the most recent valid pullback (not failed)
   */
  private getValidPullback(pullbacks: Pullback[]): Pullback | null {
    if (pullbacks.length === 0) return null;
    // Filter out excessive pullbacks
    const valid = pullbacks.filter((p) => p.depthCategory !== 'EXCESSIVE');
    if (valid.length === 0) return null;
    return valid[valid.length - 1] ?? null;
  }

  /**
   * Calculate entry price - confirmation candle high
   */
  private calculateEntryPrice(pullback: Pullback, context: AnalysisContext): number {
    const setupCandles = context.candles.setup;
    const confirmationIdx = pullback.confirmationCandleIndex;

    if (confirmationIdx !== undefined && confirmationIdx < setupCandles.length) {
      const candle = setupCandles[confirmationIdx];
      if (candle) {
        return candle.high; // Entry above confirmation candle high
      }
    }

    // Fallback: use current price
    return context.currentPrice;
  }

  /**
   * Calculate stop loss - below recent swing low
   */
  private calculateStopLoss(pullback: Pullback, context: AnalysisContext): number {
    const atr = context.indicators.setup.atr.atr;
    const { atrMultiplier } = this.config;

    // Option 1: Below pullback low
    const pullbackLow = this.getPullbackLow(pullback, context);
    const swingStop = pullbackLow * 0.99; // 1% below low

    // Option 2: ATR-based
    const entry = this.calculateEntryPrice(pullback, context);
    const atrStop = entry - atr * (atrMultiplier ?? 1.5);

    // Use the more conservative (lower) stop
    return Math.min(swingStop, atrStop);
  }

  /**
   * Get pullback low price
   */
  private getPullbackLow(pullback: Pullback, context: AnalysisContext): number {
    const setupCandles = context.candles.setup;
    const idx = pullback.pullbackLowIndex;
    if (idx >= 0 && idx < setupCandles.length) {
      const candle = setupCandles[idx];
      if (candle) return candle.low;
    }
    return context.currentPrice;
  }

  /**
   * Calculate targets - R-based from entry
   */
  private calculateTargets(entry: number, stopLoss: number): number[] {
    const risk = entry - stopLoss;
    if (risk <= 0) return [];

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
    pullback: Pullback,
    pattern: CandlestickPattern | null,
    riskReward: number
  ): Confirmation[] {
    const confirmations: Confirmation[] = [];

    // Higher timeframe trend
    if (this.isHigherTimeframeBullish(context)) {
      confirmations.push({
        factor: 'HTF Trend',
        description: 'Daily trend is bullish (EMA 20 > 50 > 200)',
        weight: 20,
        met: true,
      });
    }

    // Setup timeframe trend
    const setupEMA = context.indicators.setup.ema;
    if (setupEMA.ema20 > setupEMA.ema50 && setupEMA.ema50 > setupEMA.ema200) {
      confirmations.push({
        factor: 'Setup TF Trend',
        description: '4H trend is bullish',
        weight: 10,
        met: true,
      });
    }

    // Pullback structure
    if (pullback.depthCategory === 'SHALLOW' || pullback.depthCategory === 'NORMAL') {
      confirmations.push({
        factor: 'Healthy Pullback',
        description: `Pullback depth: ${(pullback.depth * 100).toFixed(0)}% (${pullback.depthCategory.toLowerCase()})`,
        weight: 15,
        met: true,
      });
    }

    // EMA touch
    if (pullback.emaTouched) {
      confirmations.push({
        factor: 'EMA Support',
        description: `Pullback found support at ${pullback.emaTouched}`,
        weight: 10,
        met: true,
      });
    }

    // Support zone
    if (pullback.supportZone) {
      confirmations.push({
        factor: 'Support Zone',
        description: `Price pulled back to support zone (strength: ${pullback.supportZone.strength}/100)`,
        weight: 10,
        met: true,
      });
    }

    // Bullish candlestick
    if (pattern) {
      confirmations.push({
        factor: 'Candlestick',
        description: `${pattern.name} at pullback low (${pattern.totalScore}/100)`,
        weight: 15,
        met: true,
      });
    }

    // RSI confirmation
    const rsi = context.indicators.setup.rsi.rsi;
    if (rsi > 50 && rsi < 70) {
      confirmations.push({
        factor: 'RSI Bullish',
        description: `RSI at ${rsi.toFixed(1)} - bullish but not overextended`,
        weight: 10,
        met: true,
      });
    }

    // CPR alignment
    const cpr = context.cpr.setup;
    if (cpr && (cpr.alignment === 'BULLISH' || cpr.position === 'ABOVE')) {
      confirmations.push({
        factor: 'CPR Alignment',
        description: `Price ${cpr.position} CPR, alignment: ${cpr.alignment}`,
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
  private buildInvalidations(pullback: Pullback, context: AnalysisContext): string[] {
    const invalidations = [];

    // Daily close below swing low invalidates
    const swingLow = this.getPullbackLow(pullback, context);
    invalidations.push(`Daily close below ${(swingLow * 0.99).toFixed(2)} invalidates setup`);

    // Close below entry stop loss
    invalidations.push(`Close below stop loss invalidates setup`);

    // Higher timeframe trend change
    const htfEMA = context.indicators.higher.ema;
    if (htfEMA.ema20 < htfEMA.ema50) {
      invalidations.push('Daily EMA 20 crosses below EMA 50 - trend weakening');
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
    pullback: Pullback,
    pattern: CandlestickPattern | null
  ): TradingSetup {
    const riskPerShare = entry - stopLoss;
    const rewardPerShare = (targets[0] ?? 0) - entry;

    const scoreBreakdown = {
      trend: 20,
      priceAction: 18,
      supportResistance: pullback.supportZone ? 14 : 8,
      candlestick: pattern ? Math.min(15, pattern.totalScore * 0.15) : 0,
      volume: 7,
      momentum: 8,
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
      setupType: 'PULLBACK',
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
        direction: 'BULLISH' as const,
        strength: 75,
        emaAlignment: 'BULLISH' as const,
        structure: 'HH_HL' as const,
        adxValue: context.indicators.setup.adx.adx,
      },
      explanation: this.generateExplanation(context, pullback, pattern, riskReward),
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    context: AnalysisContext,
    pullback: Pullback,
    pattern: CandlestickPattern | null,
    riskReward: number
  ): string {
    const parts: string[] = [];

    parts.push(`Why this setup?`);
    parts.push(``);

    // Trend confirmations
    if (this.isHigherTimeframeBullish(context)) {
      parts.push(`✓ Price is above EMA 20 and EMA 50 on daily timeframe`);
      parts.push(`✓ Daily trend is bullish (EMA 20 > EMA 50 > EMA 200)`);
    }

    parts.push(`✓ Higher-high / higher-low structure on 4H`);
    parts.push(`✓ Price pulled back ${(pullback.depth * 100).toFixed(0)}% to support zone`);

    if (pullback.emaTouched) {
      parts.push(`✓ Pullback found support at ${pullback.emaTouched}`);
    }

    if (pullback.supportZone) {
      parts.push(`✓ Bullish ${pattern?.name ?? 'candlestick'} at support`);
    }

    // Candlestick
    if (pattern) {
      parts.push(`✓ ${pattern.name} confirmed the pullback`);
    }

    // RSI
    const rsi = context.indicators.setup.rsi.rsi;
    parts.push(`✓ RSI is bullish at ${rsi.toFixed(1)} but not overextended`);

    // CPR
    const cpr = context.cpr.setup;
    if (cpr && cpr.alignment === 'BULLISH') {
      parts.push(`✓ CPR is supportive (bullish alignment)`);
    }

    parts.push(`✓ Risk/reward is ${riskReward.toFixed(1)}:1`);

    parts.push(``);
    parts.push(`Risk factors:`);
    parts.push(`⚠ Pullback could deepen further`);
    parts.push(`⚠ Overall market trend should be monitored`);

    parts.push(``);
    parts.push(`Invalidation:`);
    parts.push(`Daily close below ${(this.getPullbackLow(pullback, context) * 0.99).toFixed(2)}`);

    return parts.join('\n');
  }

  /**
   * Generate strategy signals
   */
  private generateSignals(
    context: AnalysisContext,
    pullback: Pullback,
    pattern: CandlestickPattern | null
  ): StrategySignal[] {
    const signals: StrategySignal[] = [];

    const entry = this.calculateEntryPrice(pullback, context);
    signals.push({
      type: 'ENTRY',
      message: `Pullback entry at ${entry.toFixed(2)}`,
      strength: pullback.strength,
      timestamp: context.currentTimestamp,
    });

    if (pattern) {
      signals.push({
        type: 'INFO',
        message: `${pattern.name} confirmation (${pattern.totalScore}/100)`,
        strength: pattern.totalScore,
        timestamp: context.currentTimestamp,
      });
    }

    if (pullback.emaTouched) {
      signals.push({
        type: 'INFO',
        message: `Support found at ${pullback.emaTouched}`,
        strength: 75,
        timestamp: context.currentTimestamp,
      });
    }

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
