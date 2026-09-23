import { BarChart3, X } from 'lucide-react';
import { formatNumber } from '../utils/columnAnalysis';

export default function TotalsBar({ totals, filteredCount, totalCount, onClear }) {
  if (!totals || totals.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-20 bg-indigo-50 dark:bg-indigo-950/80 border-t border-indigo-200 dark:border-indigo-800 backdrop-blur px-3 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap min-w-0">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
          <BarChart3 size={12} /> Totals
        </span>
        {totals.map((t, i) => (
          <span key={i} className="text-xs whitespace-nowrap">
            <span className="text-indigo-600/70 dark:text-indigo-400/70">
              {t.name} <span className="uppercase text-[10px]">({t.metric})</span>
            </span>
            <span className="ml-1 font-semibold text-indigo-800 dark:text-indigo-200">
              {formatNumber(t.value, t.metric)}
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
          {filteredCount} / {totalCount} rows
        </span>
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900"
          title="Clear totals"
        >
          <X size={12} className="text-indigo-700 dark:text-indigo-300" />
        </button>
      </div>
    </div>
  );
}
