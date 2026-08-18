/**
 * Timeframe Tabs Component
 * 1D | 4H | 1H | 30M tabs for analysis screen
 */

'use client';

import { useAnalysisStore } from '@/lib/stores/analysis-store';

type Timeframe = '1D' | '4H' | '1H' | '30M';

const TIMEFRAMES: Timeframe[] = ['1D', '4H', '1H', '30M'];

export function TimeframeTabs() {
  const { timeframe, setTimeframe } = useAnalysisStore();

  return (
    <div
      className="flex items-center gap-1 bg-tertiary rounded p-1"
      role="tablist"
      aria-label="Chart timeframe"
    >
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          role="tab"
          aria-selected={timeframe === tf}
          onClick={() => setTimeframe(tf)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
            timeframe === tf
              ? 'bg-primary text-info-primary shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

export default TimeframeTabs;
