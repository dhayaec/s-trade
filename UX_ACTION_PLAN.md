# S-Trade UX Overhaul Action Plan

Based on UX-OVERHAUL.md recommendations. Priority order from the document.

## Phase 0: Foundation & Design System (Week 1)

### 0.1 Design System Setup

- [ ] Define color palette (dark theme: #0B0F14 bg, #11161D panels, #202731
      borders)
- [ ] Typography: Inter/Geist, tabular numbers for prices
- [ ] Border radius scale: 6px controls, 8px cards, 12px panels
- [ ] Create shadcn/ui component library extensions
- [ ] Define spacing/sizing tokens

### 0.2 Project Reorganization (Feature-based)

```
src/
├── app/
│   ├── dashboard/
│   ├── scanner/
│   ├── analysis/[symbol]/
│   ├── watchlist/
│   ├── backtest/
│   └── history/
├── features/
│   ├── market-overview/
│   ├── scanner/
│   ├── stock-analysis/
│   ├── trade-setup/
│   ├── chart/
│   ├── support-resistance/
│   ├── candlestick/
│   ├── indicators/
│   ├── risk/
│   ├── watchlist/
│   └── backtest/
├── components/ui/          # shadcn base components
├── components/analysis/    # analysis-specific composites
├── server/
├── lib/
└── types/
```

## Phase 1: Core P0 Features (Weeks 2-3)

### 1.1 Stock Search (P0)

- [ ] Global search command palette (Cmd+K)
- [ ] Debounced search with results dropdown
- [ ] Recent searches, popular symbols
- [ ] Keyboard navigation

### 1.2 Stock Analysis Screen /[symbol] (P0) - FLAGSHIP

**Layout:**

- Left sidebar: Navigation (Dashboard | Scanner | Watchlist | Analysis |
  Backtest | History)
- Top bar: Symbol search, market regime, symbol header (price, change, exchange)
- Main area: Two-column split
  - Left: Chart (70%)
  - Right: Setup card + Why this setup? + Risk/Reward (30%)

**Components:**

- [ ] Symbol header with price, change%, market regime badge
- [ ] Timeframe tabs: 1D | 4H | 1H | 30M
- [ ] Indicators dropdown menu
- [ ] Chart component (Lightweight Charts or similar)
- [ ] Setup Card (prominent, visual)
- [ ] "Why this setup?" confirmations list
- [ ] Support/Resistance zones panel
- [ ] Risk/Reward card with position size calculator
- [ ] Add to Watchlist button

### 1.3 Setup Card Component (P0)

- [ ] Direction badge (LONG/SHORT) with color
- [ ] Setup type (Breakout/Pullback/Support Bounce/Reversal)
- [ ] Confidence score with grade
- [ ] Entry, SL, Target 1, Target 2
- [ ] Risk, Reward, R:R
- [ ] Position size calculator (capital × risk%)

### 1.4 Trading Chart (P0)

- [ ] Candlesticks + volume (default)
- [ ] EMA 20, EMA 50 (default)
- [ ] Support/Resistance zones overlay
- [ ] Entry/SL/Target lines with labels
- [ ] Pattern markers (hammer, engulfing, etc.)
- [ ] Indicators layer toggle menu
- [ ] Chart layers: Price Action | Support/Resistance | Trade Setup |
      Candlestick | Trend | Volume | CPR | Indicators

### 1.5 Confidence + Explanation (P0)

- [ ] Score breakdown bars (Trend, Price Action, Volume, Momentum, Candlestick,
      Indicators, CPR, Risk/Reward)
- [ ] "Why this setup?" - confirmations with ✅
- [ ] "What could invalidate?" - warnings with ⚠️

### 1.6 Scanner Page (P0)

- [ ] Market selector [NSE] [BSE] [NASDAQ]
- [ ] Timeframe selector [1D] [4H] [1H]
- [ ] Setup type filters [All] [Breakout] [Pullback] [Support Bounce] [Reversal]
- [ ] Quick filters: [Strong setups] [R:R > 2] [Volume ↑] [Confidence > 70]
- [ ] Results as setup-oriented cards (not raw table)
- [ ] Mini visual structure per result (resistance → entry → target → SL)
- [ ] Progressive loading UX with progress bar

## Phase 2: P1 Features (Week 4)

### 2.1 Dashboard (P1)

- [ ] Market overview: NIFTY 50, BANK NIFTY, Market Regime badge
- [ ] "Top Swing Setups" - ranked list (top 5-10)
- [ ] Watchlist quick access bar
- [ ] Market conditions summary

### 2.2 Watchlist Enhancement (P1)

- [ ] Status badges: 🟢 Triggered, 🟡 Forming, 🔵 Watching, ⚪ No setup
- [ ] Sort by: Score, Distance from entry, R:R, Volume, Trend strength
- [ ] Inline setup preview on hover
- [ ] Bulk analyze button with progress UX

### 2.3 Market Regime (P1)

- [ ] Prominent regime indicator (top of dashboard/analysis)
- [ ] Trend, Momentum, Volatility, Breadth
- [ ] Best strategies for current regime
- [ ] Strategies to avoid

### 2.4 Risk Calculator (P1)

- [ ] Capital input
- [ ] Risk per trade %
- [ ] Auto-calculate max risk, suggested quantity
- [ ] Integrated in Setup Card

### 2.5 Candlestick Annotations (P1)

- [ ] Pattern markers on chart with tooltips
- [ ] Contextual details: confidence, location, trend, volume, impact
- [ ] Click marker → explanation panel

### 2.6 Support/Resistance Zones (P1)

- [ ] Visual zones on chart
- [ ] Strength indicators
- [ ] Touch count
- [ ] Panel with zone details

## Phase 3: P2 Features (Week 5)

### 3.1 Backtesting UI (P2)

- [ ] Strategy Lab: Strategy selector, Period, Universe, Risk/trade
- [ ] Run button with progress
- [ ] Results: Total trades, Win rate, Avg R:R, Profit factor, Max DD
- [ ] Equity curve chart
- [ ] "Where did it fail?" - losing trades by regime

### 3.2 Setup Lifecycle (P2)

- [ ] States: WATCHING → FORMING → CONFIRMED → TRIGGERED → TARGET 1 → TARGET 2
- [ ] Visual timeline per symbol
- [ ] Watchlist integration

### 3.3 Alerts (P2)

- [ ] Price alerts
- [ ] Setup confirmation alerts
- [ ] Target/SL hit alerts

## Phase 4: Polish & Advanced (Week 6+)

### 4.1 Mobile-First Responsive

- [ ] Bottom nav: Home | Scanner | Watchlist | Analysis
- [ ] Stack layout for analysis screen
- [ ] Touch-friendly chart interactions

### 4.2 Beginner/Advanced Mode

- [ ] Simple mode: Setup type, confidence, entry/SL/target, why
- [ ] Advanced mode: All indicators, raw values, detailed scoring

### 4.3 "Explain This" Tooltips

- [ ] Info icons on R:R, CPR, ADX, RSI, Relative Volume, Support Strength,
      Confidence Score
- [ ] Educational content on tap/hover

### 4.4 Chart Layer System

- [ ] Full layer toggle panel
- [ ] Persist user preferences

---

## Technical Debt / Infrastructure

- [ ] Migrate to feature-based folder structure
- [ ] Add chart library (Lightweight Charts / TradingView)
- [ ] WebSocket for live price updates
- [ ] Server-side analysis caching
- [ ] Error boundaries & loading states

---

## Immediate Next Steps (This Sprint)

1. **Set up design system** - colors, typography, shadcn components
2. **Create feature folder structure** - reorganize src/
3. **Build Stock Analysis screen** - the flagship page
4. **Build Setup Card component** - reusable across scanner/watchlist/analysis
5. **Integrate chart library** - with layers system
6. **Implement Scanner page** - with setup-oriented results

---

## Dependencies to Add

```json
{
  "dependencies": {
    "lightweight-charts": "^4.x", // or "trading-vue-js"
    "cmdk": "^1.x", // command palette for search
    "lucide-react": "latest", // already have
    "date-fns": "latest", // date formatting
    "zustand": "latest" // client state (watchlist, preferences)
  }
}
```

---

## Acceptance Criteria for P0 Completion

- [ ] User can search any symbol and land on analysis screen in < 3 clicks
- [ ] Analysis screen shows: chart, setup card, why/confirmations, risk/reward
- [ ] Scanner shows ranked setups with visual structure
- [ ] Confidence score is explainable with factor breakdown
- [ ] Chart has layer toggles, default shows only essential elements
- [ ] Dark theme applied consistently
- [ ] All P0 pages responsive (desktop first, mobile functional)
