# Swing Trading Analysis Platform

## 1. Project Overview

Build a web application dedicated to **BTST (Buy Today, Sell Tomorrow) through
short-term swing trading lasting a few days to several weeks**.

The application should not automatically place trades. Its purpose is to perform
systematic technical analysis and present high-quality swing-trading setups
with:

- Price-action analysis
- Trend analysis
- Support/resistance
- Japanese candlestick pattern confirmation
- CPR
- Moving averages
- Momentum indicators
- Volume analysis
- Breakout/pullback detection
- Entry price
- Stop-loss
- Target levels
- Risk/reward
- Setup confidence/score
- Explanation of why the setup qualifies
- Historical/backtesting capability
- Bulk stock scanning

The system should be designed so that trading strategies are implemented as
**independent, testable strategy modules**, rather than hard-coded into the UI.

---

# 2. Primary User Workflow

The main workflow should be:

```text
User enters stock symbol(s)
        ↓
Fetch OHLCV historical data
        ↓
Normalize market data
        ↓
Calculate technical indicators
        ↓
Analyze market structure
        ↓
Detect support/resistance
        ↓
Detect price-action setups
        ↓
Detect candlestick patterns
        ↓
Check indicator confirmation
        ↓
Calculate entry / SL / targets
        ↓
Calculate risk/reward
        ↓
Generate setup score
        ↓
Rank opportunities
        ↓
Display chart + explanation
```

For bulk scanning:

```text
Upload / paste symbols
        ↓
Analyze all symbols
        ↓
Filter invalid / insufficient-data symbols
        ↓
Run strategy engine
        ↓
Rank setups
        ↓
Display strongest opportunities first
```

---

# 3. Product Goals

## Primary Goals

1. Quickly identify swing-trading opportunities.
2. Reduce manual chart analysis.
3. Combine price action with technical confirmation.
4. Provide objective entry/SL/target calculations.
5. Explain every generated setup.
6. Allow analysis of one stock or hundreds of stocks.
7. Make strategies configurable.
8. Make all calculations deterministic and testable.
9. Support historical backtesting before trusting a strategy.

## Non-Goals for V1

Do NOT build:

- Automatic broker order placement
- Intraday high-frequency trading
- Options trading
- Futures trading
- Portfolio management
- Social trading
- Copy trading
- AI-generated stock predictions
- Guaranteed-profit signals

The application is an **analysis and decision-support system**.

---

# 4. Recommended Technology Stack

Use a modern TypeScript-first architecture.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui or equivalent component system
- Zustand for local/global UI state
- TanStack Query for server data
- Lightweight Charts or TradingView-compatible charting library

## Backend

Prefer:

- Next.js API/server layer initially
- TypeScript
- PostgreSQL
- Prisma or Drizzle ORM

The analysis engine should be separated from HTTP/UI code.

Example:

```text
src/
  app/
  components/
  features/
  lib/
  server/
  analysis/
```

---

# 5. High-Level Architecture

```text
                    ┌────────────────────┐
                    │      Next.js UI    │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Analysis API       │
                    └─────────┬──────────┘
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                 ▼
      Market Data       Analysis Engine     Scanner
       Service             Service           Service
             │                │                 │
             ▼                ▼                 ▼
       OHLCV Store      Indicators        Strategy Engine
                              │
                              ▼
                       Setup Scoring
                              │
                              ▼
                     Risk Management
                              │
                              ▼
                     Analysis Result
```

---

# 6. Domain Model

Create clear domain types.

## Symbol

```typescript
interface Symbol {
  exchange: string;
  symbol: string;
  name: string;
  sector?: string;
}
```

## Candle

```typescript
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

## PriceLevel

```typescript
interface PriceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  source: string;
}
```

## Setup

```typescript
interface TradingSetup {
  symbol: string;

  direction: 'LONG' | 'SHORT';

  setupType:
    | 'BREAKOUT'
    | 'PULLBACK'
    | 'REVERSAL'
    | 'SUPPORT_BOUNCE'
    | 'RESISTANCE_REJECTION';

  entry: number;

  stopLoss: number;

  targets: number[];

  riskReward: number;

  confidenceScore: number;

  trendScore: number;

  momentumScore: number;

  volumeScore: number;

  priceActionScore: number;

  candlestickScore: number;

  indicatorScore: number;

  confirmations: Confirmation[];

  invalidations: string[];

  generatedAt: number;
}
```

---

# 7. Timeframes

The application should support:

### Primary

- 1D
- 4H
- 1H

### Optional

- 30m
- 15m

For swing trading, the default analysis should use:

```text
Higher timeframe → 1D
Setup timeframe   → 4H / 1H
Entry refinement  → 1H
```

The exact timeframe configuration should be strategy-dependent.

---

# 8. Historical Data Requirements

The system should maintain enough historical OHLCV data to calculate:

- 20 EMA
- 50 EMA
- 100 EMA
- 200 EMA
- RSI
- ADX
- ATR
- volume averages
- support/resistance
- CPR
- previous highs/lows
- swing structure

Recommended minimum:

```text
1D: 1–2 years
4H: 6–12 months
1H: 3–6 months
```

The data provider must be abstracted.

```typescript
interface MarketDataProvider {
  getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
    from: Date,
    to: Date
  ): Promise<Candle[]>;

  getLatestQuote(symbol: string): Promise<Quote>;
}
```

Do not tightly couple the analysis engine to a specific market-data provider.

---

# 9. Technical Indicator Engine

Create an independent indicator layer.

Required indicators:

## Trend

- EMA 20
- EMA 50
- EMA 100
- EMA 200
- ADX

## Momentum

- RSI 14
- MACD

## Volatility

- ATR 14

## Volume

- Volume SMA 20
- Relative volume

## Price Structure

- Previous day high
- Previous day low
- Previous week high
- Previous week low
- Swing highs
- Swing lows

## Pivot/Levels

- CPR
- Traditional pivot levels
- Support/resistance zones

Each indicator should return structured data.

Example:

```typescript
interface IndicatorResult<T> {
  value: T;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

---

# 10. CPR Engine

Implement Central Pivot Range.

Calculate:

```text
Pivot
BC
TC
```

Use previous trading day's OHLC.

Also calculate CPR width.

Classify CPR:

```text
Narrow CPR
Normal CPR
Wide CPR
```

Detect:

- CPR breakout
- CPR rejection
- price above CPR
- price below CPR
- price inside CPR
- CPR alignment with trend
- multi-day CPR characteristics

CPR should be a confirmation factor rather than a standalone trading signal.

---

# 11. Price Action Engine

This is one of the most important components.

Detect:

## Market Structure

- Higher High
- Higher Low
- Lower High
- Lower Low
- Break of structure
- Change of character

## Breakouts

Detect:

- Resistance breakout
- Previous high breakout
- Range breakout
- Consolidation breakout
- Volume-supported breakout

## Pullbacks

Detect:

```text
Uptrend
   ↓
Impulse
   ↓
Pullback
   ↓
Support / EMA
   ↓
Bullish confirmation
   ↓
Potential entry
```

## Support Bounce

Detect price approaching a strong support zone followed by bullish confirmation.

## Resistance Rejection

Detect price approaching resistance followed by bearish rejection.

---

# 12. Support and Resistance Engine

Support/resistance should not be represented only as single prices.

Prefer zones:

```typescript
interface PriceZone {
  lower: number;
  upper: number;
  strength: number;
  touches: number;
  timeframe: Timeframe;
  source: string[];
}
```

Possible sources:

- Previous swing highs/lows
- Multiple touches
- Previous day high/low
- Previous week high/low
- CPR
- Pivot levels
- Consolidation boundaries
- Major breakout levels

Calculate a strength score.

Example:

```text
Touch count
+ timeframe importance
+ volume reaction
+ historical rejection
+ breakout significance
```

---

# 13. Japanese Candlestick Pattern Engine

Create a dedicated pattern detector.

Initially support:

### Bullish

- Hammer
- Bullish Engulfing
- Morning Star
- Piercing Pattern
- Inverted Hammer

### Bearish

- Shooting Star
- Bearish Engulfing
- Evening Star
- Dark Cloud Cover

### Neutral / Context

- Doji
- Spinning Top
- Inside Bar

Each pattern should return:

```typescript
interface CandlestickPattern {
  name: string;

  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';

  confidence: number;

  candleIndexes: number[];

  explanation: string;
}
```

Important:

**Do not treat a candlestick pattern as a standalone buy/sell signal.**

The pattern must be evaluated in context:

```text
Pattern
+
Location
+
Trend
+
Volume
+
Support/Resistance
```

For example:

```text
Hammer at random location
     ≠
Hammer at strong daily support after pullback
```

The second should receive a substantially higher score.

---

# 14. Swing Strategy Engine

Implement strategies independently.

## Strategy 1 — Breakout

Conditions:

```text
Strong resistance
+
Price breaks resistance
+
Close above resistance
+
Volume expansion
+
Trend confirmation
```

Potential entry:

```text
Breakout close
OR
breakout retest
```

Stop-loss:

```text
Below breakout zone
OR
ATR-based distance
```

---

## Strategy 2 — Pullback in Uptrend

Conditions:

```text
Price > EMA 50
EMA 20 > EMA 50
Higher-high / higher-low structure
Price pulls back
Price reaches support / EMA
Bullish candlestick confirmation
```

Potential entry:

```text
Confirmation candle high
```

Stop-loss:

```text
Below recent swing low
```

---

## Strategy 3 — Support Bounce

Conditions:

```text
Strong support
+
Price approaches support
+
Rejection candle
+
Bullish confirmation
+
Momentum confirmation
```

---

## Strategy 4 — Trend Reversal

This should be more conservative.

Look for:

```text
Existing downtrend
+
Momentum divergence / exhaustion
+
Strong support
+
Bullish structure break
+
Bullish candlestick confirmation
```

Only generate a high-confidence reversal setup when multiple confirmations
exist.

---

# 15. Setup Scoring Engine

Do not return only:

```text
BUY
```

Instead calculate a score.

Example:

```text
Trend                 20
Price Action          20
Support/Resistance    15
Candlestick           15
Volume                10
Momentum              10
CPR                   5
Risk/Reward           5
-------------------------
Total                100
```

Example classification:

```text
80–100  Excellent setup
70–79   Strong setup
60–69   Moderate setup
50–59   Weak setup
<50     Reject
```

These thresholds must be configurable.

---

# 16. Risk Management Engine

Every setup must calculate:

```text
Entry
Stop Loss
Target 1
Target 2
Target 3
Risk per share
Potential reward
Risk/Reward
```

Example:

```text
Entry       ₹500
Stop Loss   ₹480
Target 1    ₹540
Target 2    ₹560
```

Risk:

```text
500 - 480 = ₹20
```

Target 1 reward:

```text
540 - 500 = ₹40
```

R:R:

```text
40 / 20 = 2R
```

Reject setups where minimum acceptable R:R is not achieved.

Make the minimum R:R configurable.

---

# 17. Position Sizing

Provide optional position-size calculation.

Inputs:

```text
Capital
Maximum risk %
Entry
Stop Loss
```

Formula:

```text
Risk amount =
Capital × Risk %

Risk/share =
|Entry - Stop Loss|

Quantity =
Risk amount / Risk per share
```

Round quantity according to exchange constraints.

The UI must clearly distinguish:

```text
Analysis
```

from:

```text
Actual order
```

No automatic trade execution.

---

# 18. Opportunity Scanner

Create a scanner page.

Input:

```text
NIFTY 50
NIFTY 100
NIFTY 500
Custom symbols
Watchlist
```

Allow:

- Paste symbols
- CSV upload
- Watchlist selection
- Search symbol
- Select multiple symbols

Scanner output:

| Symbol | Setup    | Score | Entry |   SL | Target | R:R | Trend   |
| ------ | -------- | ----: | ----: | ---: | -----: | --: | ------- |
| ABC    | Breakout |    88 |  ₹500 | ₹480 |   ₹540 | 2.0 | Bullish |
| XYZ    | Pullback |    82 |  ₹720 | ₹695 |   ₹770 | 2.0 | Bullish |

Sort by:

- Score
- R:R
- Volume
- Trend strength
- Setup type

---

# 19. Stock Analysis Page

Example route:

```text
/stocks/RELIANCE
```

Page structure:

```text
------------------------------------------------
Symbol / Price / Change
------------------------------------------------

Setup Summary

[Strong Bullish Setup]
Score: 86/100

Entry     ₹X
SL        ₹Y
Target 1  ₹Z
Target 2  ₹A
R:R       2.4
------------------------------------------------

             PRICE CHART

   Resistance ─────────────
                    ↑ Entry

       candles

   Support ────────────────
------------------------------------------------

Trend
✓ Above EMA 20
✓ Above EMA 50
✓ Higher High / Higher Low

Candlestick
✓ Bullish Engulfing

Volume
✓ Above average

CPR
✓ Bullish position

Risk
✓ R:R above threshold
------------------------------------------------

Why this setup?
[Human-readable explanation]
------------------------------------------------
```

---

# 20. Interactive Chart

Chart should display:

- Candlesticks
- EMA 20
- EMA 50
- EMA 200
- CPR
- Support zones
- Resistance zones
- Entry
- Stop-loss
- Target 1
- Target 2
- Target 3
- Volume
- Candlestick pattern markers
- Breakout markers
- Swing high/low markers

Allow users to toggle layers.

Example:

```text
☑ EMA 20
☑ EMA 50
☐ EMA 200
☑ Support/Resistance
☑ CPR
☑ Entry/SL/Targets
☑ Candlestick patterns
☐ Volume
```

---

# 21. Explainability

Every setup must explain **why** it was generated.

Example:

```text
Why this setup?

✓ Price is above EMA 20 and EMA 50
✓ Daily trend is bullish
✓ Price broke a 30-day resistance zone
✓ Breakout volume is 1.8x average
✓ Bullish engulfing appeared at the breakout/retest area
✓ RSI is bullish but not overextended
✓ CPR is supportive
✓ Risk/reward is 2.4:1

Risk factors:

⚠ Resistance exists 3.5% above entry
⚠ Overall market trend should be monitored
```

This is more valuable than simply displaying a BUY label.

---

# 22. Market Regime Detection

Before running strategies, determine the market regime.

Classify:

```text
TRENDING_UP
TRENDING_DOWN
RANGE_BOUND
HIGH_VOLATILITY
LOW_VOLATILITY
```

Example:

```text
Trending market
→ prioritize breakout/pullback strategies

Range-bound market
→ prioritize support/resistance strategies

High volatility
→ increase risk warnings
```

This should influence setup scoring.

---

# 23. Multi-Timeframe Analysis

Do not analyze a stock using only one timeframe.

Example:

```text
Daily:
Bullish

4H:
Bullish pullback

1H:
Bullish reversal candle
```

This produces stronger confirmation.

Example score:

```text
Daily trend         +20
4H structure        +20
1H confirmation     +15
Volume              +10
S/R                 +15
Candlestick         +10
Risk/reward         +10
```

---

# 24. Backtesting Engine

Backtesting is a major feature and should be architected from the beginning even
if implemented after MVP.

The same strategy engine used for live scanning should work against historical
candles.

```text
Historical candles
       ↓
Strategy Engine
       ↓
Setup generated
       ↓
Entry
       ↓
SL / Target simulation
       ↓
Trade result
```

Metrics:

- Total trades
- Winning trades
- Losing trades
- Win rate
- Average R
- Maximum drawdown
- Profit factor
- Average holding period
- Largest loss
- Largest win
- Expectancy

Do not create a separate strategy implementation for backtesting.

---

# 25. Strategy Configuration

Strategies should be configurable.

Example:

```typescript
interface StrategyConfig {
  minScore: number;
  minRiskReward: number;

  emaFast: number;
  emaSlow: number;

  rsiMin?: number;
  rsiMax?: number;

  volumeMultiplier?: number;

  atrMultiplier?: number;
}
```

Eventually allow configuration from the UI.

---

# 26. Database Design

Suggested tables:

```text
symbols
market_candles
technical_indicators
support_resistance_zones
analysis_runs
trading_setups
candlestick_patterns
watchlists
watchlist_symbols
strategies
strategy_configs
backtest_runs
backtest_trades
```

Do not unnecessarily persist every calculated indicator initially.

Prefer recalculation/caching depending on data volume.

---

# 27. API Design

Suggested APIs:

```text
GET /api/stocks/:symbol

GET /api/stocks/:symbol/candles

GET /api/stocks/:symbol/analysis

POST /api/scanner

POST /api/scanner/bulk

GET /api/watchlists

POST /api/watchlists

GET /api/strategies

POST /api/backtests

GET /api/backtests/:id
```

Example scanner request:

```json
{
  "symbols": ["RELIANCE", "TCS", "INFY"],
  "timeframe": "1D",
  "strategies": ["BREAKOUT", "PULLBACK", "SUPPORT_BOUNCE"],
  "minScore": 70
}
```

---

# 28. Performance Requirements

Bulk scanning is potentially expensive.

Do not calculate everything sequentially.

Use:

```text
Symbol batch
   ↓
Parallel data retrieval
   ↓
Indicator calculation
   ↓
Strategy evaluation
   ↓
Scoring
```

Limit concurrency to protect the market-data provider.

Use caching for:

- OHLCV data
- calculated indicators
- analysis results

Avoid recalculating unchanged historical candles.

---

# 29. Background Jobs

Introduce a job abstraction even if initially running locally.

Possible jobs:

```text
market-data-sync
indicator-calculation
scanner-run
backtest-run
```

Later this can be moved to:

- BullMQ
- Redis
- cron
- worker service

Do not tightly couple the application to the job provider.

---

# 30. Watchlist

Users should be able to create watchlists.

Example:

```text
My Swing Watchlist

RELIANCE
TCS
INFY
HDFCBANK
ICICIBANK
SBIN
```

For each symbol show:

```text
Trend
Score
Setup
Price
Potential Entry
SL
Target
```

---

# 31. Alerts — Phase 2

Eventually support:

```text
Price reaches entry
Breakout detected
Setup score crosses threshold
Bullish pattern detected
Target reached
Stop-loss reached
```

Channels can be added later.

Do not make alerts a V1 dependency.

---

# 32. UI Pages

## Dashboard

```text
Market Regime

Top Swing Opportunities

Breakouts
Pullbacks
Reversals

Watchlists

Recent Analysis
```

## Scanner

```text
Symbol input
Filters
Strategy selection
Scan button

Results table
```

## Stock Analysis

```text
Chart
Setup
Indicators
Risk
Explanation
```

## Watchlists

```text
Watchlist management
```

## Backtesting

```text
Strategy
Date range
Universe
Parameters

Results
Equity curve
Trades
Metrics
```

## Settings

```text
Risk settings
Strategy settings
Data settings
Chart preferences
```

---

# 33. Filtering

Scanner filters should include:

### Trend

- Bullish
- Bearish
- Neutral

### Setup

- Breakout
- Pullback
- Support bounce
- Reversal

### Score

```text
70+
80+
90+
```

### R:R

```text
1.5+
2+
3+
```

### Volume

```text
Above average
1.5x average
2x average
```

### Market cap / universe

Optional depending on available market data.

---

# 34. Testing Strategy

The analysis engine requires extensive unit tests.

Test independently:

```text
EMA
RSI
ATR
ADX
CPR
Support/resistance
Swing detection
Candlestick detection
Breakout detection
Pullback detection
Risk calculation
Position sizing
Scoring
```

Then integration test:

```text
OHLCV
 ↓
Indicators
 ↓
Price Action
 ↓
Candlestick
 ↓
Strategy
 ↓
Risk
 ↓
Score
```

Finally use historical fixtures for complete end-to-end tests.

---

# 35. Important Engineering Rule

Do not bury trading logic inside React components.

Bad:

```tsx
if (price > ema50 && rsi > 50) {
   ...
}
```

inside UI components.

Good:

```text
React UI
   ↓
Analysis API
   ↓
Analysis Service
   ↓
Strategy Engine
```

Trading calculations must be pure TypeScript functions wherever possible.

This makes them:

- Testable
- Reusable
- Backtestable
- Deterministic
- Easier to optimize

---

# 36. Suggested Code Structure

```text
src/

  app/
    dashboard/
    scanner/
    stocks/
    watchlists/
    backtests/
    settings/

  components/
    charts/
    scanner/
    setup/
    indicators/
    risk/
    common/

  analysis/
    indicators/
      ema.ts
      rsi.ts
      macd.ts
      atr.ts
      adx.ts
      volume.ts

    price-action/
      market-structure.ts
      swing-points.ts
      breakout.ts
      pullback.ts
      support-resistance.ts

    candlesticks/
      hammer.ts
      engulfing.ts
      morning-star.ts
      shooting-star.ts
      doji.ts

    pivots/
      cpr.ts
      pivots.ts

    strategies/
      breakout.ts
      pullback.ts
      support-bounce.ts
      reversal.ts

    scoring/
      setup-score.ts

    risk/
      stop-loss.ts
      targets.ts
      position-size.ts
      risk-reward.ts

    engine/
      analysis-engine.ts
      multi-timeframe.ts

  server/
    market-data/
    scanner/
    backtesting/
    jobs/

  db/
    schema/
    repositories/

  types/
```

---

# 37. MVP Scope

Do NOT attempt to build everything at once.

## MVP Phase 1

Implement:

- Stock symbol search
- Historical OHLCV ingestion
- Candlestick chart
- EMA 20/50/200
- RSI
- ATR
- Volume
- CPR
- Support/resistance
- Basic candlestick patterns
- Breakout detection
- Pullback detection
- Entry
- Stop-loss
- Target
- R:R
- Setup score
- Explanation

Primary screen:

```text
Stock Analysis
```

---

# 38. Phase 2 — Scanner

Add:

- Bulk symbols
- Watchlists
- Scanner
- Ranking
- Filters
- Multiple strategies
- Multi-timeframe analysis
- Market regime

---

# 39. Phase 3 — Backtesting

Add:

- Strategy backtesting
- Historical trade simulation
- Performance metrics
- Equity curve
- Trade-by-trade analysis
- Parameter configuration

Critical requirement:

**Backtesting and live analysis must use the same strategy engine.**

---

# 40. Phase 4 — Automation

Add:

- Scheduled market-data updates
- Scheduled scanner runs
- Cached analysis
- Alerts
- Background workers

---

# 41. Phase 5 — Advanced Analytics

Potential future features:

- Strategy comparison
- Setup quality history
- Pattern performance statistics
- Sector strength
- Relative strength
- Market breadth
- NIFTY trend confirmation
- Sector trend confirmation
- Correlation analysis
- Advanced multi-timeframe setups

---

# 42. Agent Development Rules

The coding agent must follow these rules.

### Rule 1

Build incrementally.

Do not create the entire application in one pass.

### Rule 2

Every feature must have tests.

### Rule 3

Keep analysis logic independent from UI.

### Rule 4

Do not hard-code market-data provider logic into strategies.

### Rule 5

Do not hard-code strategy thresholds throughout the codebase.

### Rule 6

Use TypeScript strict mode.

### Rule 7

Prefer pure functions for calculations.

### Rule 8

Avoid premature microservices.

Start as a modular monolith.

### Rule 9

All strategy results must be explainable.

### Rule 10

Never generate a setup without:

```text
Entry
Stop-loss
Target
Risk/reward
Confidence score
Reason
Invalidation conditions
```

---

# 43. Definition of Done for an Analysis

An analysis is considered complete only when the system can produce:

```text
Symbol
Current Price

Market Regime

Trend
Market Structure

Support Zones
Resistance Zones

Detected Candlestick Patterns

Indicator Values

Setup Type

Entry
Stop Loss
Target 1
Target 2

Risk/Reward

Setup Score

Confirmation List

Risk/Invalidation List

Human-readable Explanation
```

---

# 44. Example Final Output

For a hypothetical stock:

```text
RELIANCE

Setup: Bullish Pullback
Score: 84/100

Market Regime:
Trending Up

Trend:
Bullish

Entry:
₹1,250

Stop Loss:
₹1,210

Target 1:
₹1,330

Target 2:
₹1,380

Risk/Reward:
2.0 : 1

Confirmations:

✓ Price above EMA 50
✓ EMA 20 above EMA 50
✓ Higher-high / higher-low structure
✓ Pullback into previous support
✓ Bullish engulfing candle
✓ Volume confirmation
✓ RSI above 50
✓ CPR supportive

Risks:

⚠ Resistance near ₹1,330
⚠ Market-wide trend could invalidate setup

Invalidation:

Daily close below ₹1,210
```

---

# 45. Initial Backlog for Coding Agent

## Sprint 1 — Foundation

- [ ] Initialize Next.js + TypeScript
- [ ] Configure linting
- [ ] Configure formatting
- [ ] Configure testing
- [ ] Configure database
- [ ] Create domain models
- [ ] Create market-data provider interface
- [ ] Create OHLCV repository
- [ ] Implement symbol search

## Sprint 2 — Chart

- [ ] Implement candlestick chart
- [ ] Historical data loading
- [ ] Timeframe selector
- [ ] Zoom/pan
- [ ] Volume
- [ ] EMA overlays

## Sprint 3 — Indicator Engine

- [ ] EMA
- [ ] RSI
- [ ] MACD
- [ ] ATR
- [ ] ADX
- [ ] Volume analysis
- [ ] CPR
- [ ] Unit tests

## Sprint 4 — Price Action

- [ ] Swing high/low detection
- [ ] Market structure
- [ ] Support zones
- [ ] Resistance zones
- [ ] Breakout detection
- [ ] Pullback detection
- [ ] Unit tests

## Sprint 5 — Candlesticks

- [ ] Hammer
- [ ] Shooting star
- [ ] Bullish engulfing
- [ ] Bearish engulfing
- [ ] Morning star
- [ ] Evening star
- [ ] Doji
- [ ] Context-aware scoring
- [ ] Tests

## Sprint 6 — Strategy Engine

- [ ] Breakout strategy
- [ ] Pullback strategy
- [ ] Support bounce
- [ ] Reversal
- [ ] Strategy configuration
- [ ] Multi-timeframe confirmation

## Sprint 7 — Risk Engine

- [ ] Entry calculation
- [ ] Stop-loss calculation
- [ ] Target calculation
- [ ] R:R
- [ ] Position sizing
- [ ] Risk validation

## Sprint 8 — Scoring

- [ ] Trend score
- [ ] Price-action score
- [ ] Candlestick score
- [ ] Volume score
- [ ] Momentum score
- [ ] CPR score
- [ ] R:R score
- [ ] Overall setup score
- [ ] Explanation generator

## Sprint 9 — Scanner

- [ ] Bulk symbol input
- [ ] Watchlists
- [ ] Parallel scanning
- [ ] Ranking
- [ ] Filters
- [ ] Scanner result table

## Sprint 10 — Backtesting

- [ ] Historical simulation
- [ ] Entry/SL/target simulation
- [ ] Trade records
- [ ] Win rate
- [ ] Profit factor
- [ ] Expectancy
- [ ] Drawdown
- [ ] Equity curve

---

# 46. First Coding-Agent Instruction

Start with **Sprint 1 only**.

Before writing implementation code:

1. Create the project architecture.
2. Define domain interfaces.
3. Define database schema.
4. Define market-data provider abstraction.
5. Define analysis-engine interfaces.
6. Define strategy interfaces.
7. Define test structure.
8. Document architectural decisions.

Do not implement advanced strategies yet.

Once the foundation is reviewed, proceed to the indicator engine.

---

# 47. Core Architectural Principle

The most important design decision is:

```text
              MARKET DATA
                   │
                   ▼
             INDICATORS
                   │
                   ▼
            PRICE ACTION
                   │
                   ▼
           CANDLESTICK PATTERNS
                   │
                   ▼
             STRATEGY ENGINE
                   │
                   ▼
             RISK ENGINE
                   │
                   ▼
            SCORING ENGINE
                   │
                   ▼
          ┌────────┴────────┐
          ▼                 ▼
       SCANNER            CHART
          │                 │
          └────────┬────────┘
                   ▼
              BACKTESTING
```

The **strategy engine should be the heart of the application**.

The UI should only visualize the result.

This architecture allows the same strategy to power:

```text
Live analysis
     +
Bulk scanner
     +
Historical backtesting
     +
Future alerts
```

without duplicating trading logic.

---

# 48. Final Product Vision

The finished application should feel like a **technical-analysis copilot for
short-term swing traders**.

Instead of forcing the user to manually inspect 100 charts:

```text
User:
"Analyze these 100 stocks."

Application:

100 stocks
    ↓
Technical analysis
    ↓
Price action
    ↓
Candlestick confirmation
    ↓
CPR
    ↓
Volume
    ↓
Risk/reward
    ↓
Scoring
    ↓

Top Opportunities

1. ABC — 91
2. XYZ — 87
3. PQR — 84
4. DEF — 81
5. LMN — 79
```

The user can then open any candidate and see **exactly why it was ranked
highly**, including the chart, entry, stop-loss, targets, confirmations, and
invalidation conditions.

The system should provide **structured analysis rather than pretending to
predict the future**. Every setup must be measurable, explainable, configurable,
and backtestable.
