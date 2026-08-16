/**
 * Breakout Strategy
 * Detects breakout setups: resistance break + volume + trend alignment
 */
import type {
  AnalysisContext,
  StrategyResult,
  StrategyConfig,
  StrategySignal,
} from '@/types/strategy';
import { BaseStrategy } from './base';
import type { Breakout } from '@/types/price-action';
import type { CandlestickPattern } from '@/types/candlesticks';
import type { Candle } from '@/types/market-data';
import type { Confirmation, TradingSetup } from '@/types/setup';

export class BreakoutStrategy extends BaseStrategy {
  override readonly name = 'BREAKOUT' as const;

  constructor(config: StrategyConfig) {
    super('BREAKOUT', config);
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

    // 5. Find active breakouts in setup timeframe
    const breakouts = context.priceAction.setup.breakouts;
    if (breakouts.length === 0) {
      return null;
    }

    // 6. Get the most recent valid breakout
    const activeBreakout = this.getValidBreakout(breakouts, context.candles.setup);
    if (!activeBreakout) {
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
    const entryPrice = activeBreakout.breakoutPrice;
    const stopLoss = this.calculateStopLoss(activeBreakout, context);
    const targets = this.calculateTargets(entryPrice, stopLoss);

    // 11. Validate risk/reward
    const riskReward = this.calculateRiskReward(entryPrice, stopLoss, targets[0] ?? 0);
    if (riskReward < config.minRiskReward) {
      return null;
    }

    // 12. Build confirmations
    const confirmations = this.buildConfirmations(
      context,
      activeBreakout,
      bullishPattern,
      riskReward
    );

    // 13. Build invalidations
    const invalidations = this.buildInvalidations(activeBreakout, context);

    // 14. Create setup object
    const setup = this.createSetup(
      context,
      entryPrice,
      stopLoss,
      targets,
      riskReward,
      confirmations,
      invalidations,
      activeBreakout,
      bullishPattern
    );

    return {
      setup,
      signals: this.generateSignals(context, activeBreakout, bullishPattern),
      metadata: {
        breakoutType: activeBreakout.type,
        breakoutStrength: activeBreakout.strength,
        volumeMultiplier: activeBreakout.volumeMultiplier,
        breakoutZone: {
          lower: activeBreakout.zone.lower,
          upper: activeBreakout.zone.upper,
          strength: activeBreakout.zone.strength,
        },
      },
    };
  }

  /**
   * Get the most recent valid breakout that hasn't failed
   */
  private getValidBreakout(breakouts: Breakout[], candles: Candle[]): Breakout | null {
    // Filter for valid breakouts (not failed)
    const validBreakouts = breakouts.filter((b) => {
      // Check if breakout is still valid (price hasn't fallen back below zone)
      const breakoutIdx = b.breakoutCandleIndex;
      for (let i = breakoutIdx + 1; i < candles.length; i++) {
        const candle = candles[i];
        if (!candle) continue;
        if (candle.close < b.zone.lower) {
          return false; // Breakout failed
        }
      }
      return true;
    });

    if (validBreakouts.length === 0) return null;

    // Return the most recent one
    return validBreakouts[validBreakouts.length - 1] ?? null;
  }

  /**
   * Calculate stop loss for breakout
   * Below breakout zone or ATR-based
   */
  private calculateStopLoss(breakout: Breakout, context: AnalysisContext): number {
    const atr = context.indicators.setup.atr.atr;
    const { atrMultiplier } = this.config;

    // Option 1: Below breakout zone
    const zoneStop = breakout.zone.lower - (breakout.zone.upper - breakout.zone.lower) * 0.1;

    // Option 2: ATR-based
    const atrStop = breakout.breakoutPrice - atr * (atrMultiplier ?? 1.5);

    // Use the tighter stop (more conservative)
    return Math.max(zoneStop, atrStop);
  }

  /**
   * Calculate targets for breakout
   * R-based targets from entry
   */
  private calculateTargets(entry: number, stopLoss: number): number[] {
    const risk = entry - stopLoss;
    if (risk <= 0) return [];

    // Default R-multipliers: 1R, 2R, 3R
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
    breakout: Breakout,
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

    // Breakout with volume
    if (breakout.volumeMultiplier >= (this.config.volumeMultiplier ?? 1.5)) {
      confirmations.push({
        factor: 'Volume Breakout',
        description: `Breakout volume ${breakout.volumeMultiplier.toFixed(1)}x average`,
        weight: 15,
        met: true,
      });
    }

    // Breakout strength
    if (breakout.strength >= 70) {
      confirmations.push({
        factor: 'Strong Breakout',
        description: `Breakout strength: ${breakout.strength}/100`,
        weight: 10,
        met: true,
      });
    }

    // Retest confirmation
    if (breakout.retested) {
      confirmations.push({
        factor: 'Retest Hold',
        description: 'Price retested breakout zone and held',
        weight: 10,
        met: true,
      });
    }

    // Bullish candlestick
    if (pattern) {
      confirmations.push({
        factor: 'Candlestick',
        description: `${pattern.name} at breakout (${pattern.totalScore}/100)`,
        weight: 15,
        met: true,
      });
    }

    // RSI confirmation
    const rsi = context.indicators.setup.rsi.rsi;
    if (rsi > 50 && rsi < 75) {
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
  private buildInvalidations(breakout: Breakout, context: AnalysisContext): string[] {
    const invalidations = [];

    // Daily close below breakout zone invalidates
    invalidations.push(`Daily close below ${breakout.zone.lower.toFixed(2)} invalidates breakout`);

    // Close below entry stop loss
    invalidations.push(`Close below stop loss invalidates setup`);

    // Higher timeframe trend change
    const htfEMA = context.indicators.higher.ema;
    if (htfEMA.ema20 < htfEMA.ema50) {
      invalidations.push('Daily EMA 20 crosses below EMA 50 - trend weakening');
    }

    // RSI divergence
    const setupRSI = context.indicators.setup.rsi;
    if (setupRSI.rsi < 40) {
      invalidations.push('RSI below 40 - momentum weakening');
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
    breakout: Breakout,
    pattern: CandlestickPattern | null
  ): TradingSetup {
    const riskPerShare = entry - stopLoss;
    const rewardPerShare = (targets[0] ?? 0) - entry;

    // Calculate score breakdown (will be refined by scoring engine)
    const scoreBreakdown = {
      trend: 20,
      priceAction: 18,
      supportResistance: 14,
      candlestick: pattern ? Math.min(15, pattern.totalScore * 0.15) : 0,
      volume: Math.min(10, breakout.volumeMultiplier * 5),
      momentum: 8,
      cpr: context.cpr.setup?.alignment === 'BULLISH' ? 5 : 0,
      riskReward: Math.min(5, riskReward * 2),
      total: 0,
    };
    scoreBreakdown.total =
      Object.values(scoreBreakdown).reduce((a, b) => a + b, 0) - scoreBreakdown.total;

    return {
      symbol: context.symbol,
      timeframe: '4H',
      generatedAt: Date.now(),
      direction: 'LONG',
      setupType: 'BREAKOUT',
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
      explanation: this.generateExplanation(context, breakout, pattern, riskReward),
    };
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    context: AnalysisContext,
    breakout: Breakout,
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

    // Breakout details
    parts.push(
      `✓ Price broke a ${breakout.type.replace('_', ' ').toLowerCase()} zone at ${breakout.zone.center.toFixed(2)}`
    );
    parts.push(`✓ Breakout volume is ${breakout.volumeMultiplier.toFixed(1)}x average`);

    if (breakout.retested) {
      parts.push(`✓ Price retested breakout zone and held`);
    }

    // Candlestick
    if (pattern) {
      parts.push(`✓ ${pattern.name} appeared at breakout/retest area`);
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
    parts.push(`⚠ Resistance exists above current price`);
    parts.push(`⚠ Overall market trend should be monitored`);

    parts.push(``);
    parts.push(`Invalidation:`);
    parts.push(`Daily close below ${breakout.zone.lower.toFixed(2)}`);

    return parts.join('\n');
  }

  /**
   * Generate strategy signals
   */
  private generateSignals(
    context: AnalysisContext,
    breakout: Breakout,
    pattern: CandlestickPattern | null
  ): StrategySignal[] {
    const signals: StrategySignal[] = [];

    signals.push({
      type: 'ENTRY',
      message: `Breakout entry at ${breakout.breakoutPrice.toFixed(2)}`,
      strength: breakout.strength,
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

    if (breakout.retested) {
      signals.push({
        type: 'INFO',
        message: 'Breakout retested and held',
        strength: 80,
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
    return ['structure', 'resistanceZones', 'breakouts', 'consolidation'];
  }
}
