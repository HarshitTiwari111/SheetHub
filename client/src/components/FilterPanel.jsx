import { useEffect, useRef } from 'react';
import { CalendarDays, Sigma, X, ChevronDown } from 'lucide-react';
import { toDateInput } from '../utils/columnAnalysis';

const METRIC_LABELS = { sum: 'Sum', avg: 'Avg', min: 'Min', max: 'Max', count: 'Count' };
const METRICS = ['sum', 'avg', 'min', 'max', 'count'];

export default function FilterPanel({
  headers,
  columnTypes,
  dateColumn,
  setDateColumn,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedMetrics,
  toggleMetric,
  clearAll,
  onClose,
  anchorRef,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose, anchorRef]);

  const dateColumns = headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => columnTypes[i] === 'date');

  const numericColumns = headers
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => columnTypes[i] === 'number');

  const hiddenText = headers.filter((_, i) => columnTypes[i] === 'text');

  const applyQuick = (days) => {
    const to = new Date();
    const from = new Date();
    if (days) from.setDate(to.getDate() - days);
    setDateFrom(days ? toDateInput(from) : '');
    setDateTo(days ? toDateInput(to) : '');
  };

  const currentMetric = (colIdx) => selectedMetrics.find((s) => s.colIdx === colIdx)?.metric || null;

  const setMetric = (colIdx, metric) => {
    const existing = currentMetric(colIdx);
    if (existing === metric) return toggleMetric(colIdx, metric);
    if (existing) toggleMetric(colIdx, existing);
    toggleMetric(colIdx, metric);
  };

  const activeCount = selectedMetrics.length + (dateColumn !== null && (dateFrom || dateTo) ? 1 : 0);

  return (
    <div
      ref={ref}
      className="absolute right-0 mt-2 w-[min(94vw,440px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-[fadeIn_0.12s_ease-out]"
    >
      <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sigma size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">Filters &amp; totals</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {activeCount > 0 ? `${activeCount} active` : 'None active'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-[11px] font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      <div className="max-h-[65vh] overflow-y-auto no-scrollbar px-4 pt-3 pb-4 space-y-4">
        {dateColumns.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <CalendarDays size={13} className="text-slate-500 dark:text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date range</span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-2.5">
              <div className="relative">
                <select
                  value={dateColumn ?? ''}
                  onChange={(e) => setDateColumn(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full appearance-none px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:border-indigo-400 pr-8"
                >
                  <option value="">Choose date column…</option>
                  {dateColumns.map(({ h, i }) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {dateColumn !== null && (
                <div className="space-y-2.5 animate-[fadeIn_0.15s_ease-out]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-slate-100 rounded-lg outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { d: 7, label: '7d' },
                      { d: 30, label: '30d' },
                      { d: 0, label: 'All' },
                    ].map(({ d, label }) => (
                      <button
                        key={d}
                        onClick={() => applyQuick(d)}
                        className="py-1.5 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950 dark:hover:border-indigo-800 text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sigma size={13} className="text-slate-500 dark:text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Aggregate columns</span>
            </div>
            {selectedMetrics.length > 0 && (
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-medium">
                {selectedMetrics.length} selected
              </span>
            )}
          </div>

          {numericColumns.length === 0 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
              No numeric columns detected in this tab.
            </div>
          ) : (
            <div className="space-y-1">
              {numericColumns.map(({ h, i }) => {
                const active = currentMetric(i);
                return (
                  <div
                    key={i}
                    className={`rounded-lg border transition flex items-center gap-2 px-2.5 py-1.5 ${
                      active
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className={`text-xs font-medium truncate flex-1 ${active ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>{h}</span>
                    <div className="flex gap-0.5 shrink-0">
                      {METRICS.map((m) => {
                        const isActive = active === m;
                        return (
                          <button
                            key={m}
                            onClick={() => setMetric(i, m)}
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {METRIC_LABELS[m]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {hiddenText.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <span className="font-medium">Skipped ({hiddenText.length}):</span>{' '}
              {hiddenText.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
