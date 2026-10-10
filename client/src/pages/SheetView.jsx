import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  return pages;
}

function TimeAgo({ ts }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 5) return <span>just now</span>;
  if (secs < 60) return <span>{secs}s ago</span>;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return <span>{mins} min ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  return <span>{Math.floor(hrs / 24)}d ago</span>;
}

import { RefreshCw, Search, ExternalLink, Pencil, Trash2, Clock, ChevronLeft, ChevronRight, Filter, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import api from '../api/client';
import { useImpersonation } from '../context/ImpersonationContext.jsx';
import { isAdminLevel } from '../context/AuthContext.jsx';
import { useSheetData, SYNC_OPTIONS } from '../context/SheetDataContext.jsx';
import AddSheetModal from '../components/AddSheetModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import TotalsBar from '../components/TotalsBar.jsx';
import KPICards from '../components/KPICards.jsx';
import { detectColumnTypes, aggregate, parseDate, fromDateInput, parseNumber, formatNumber } from '../utils/columnAnalysis';


export default function SheetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { effectiveUser } = useImpersonation();
  const { reloadSheets, sheets } = useOutletContext();
  const { cache, getSheetData, invalidate, syncInterval, setSyncInterval, cacheKey } = useSheetData();
  const isAdmin = isAdminLevel(effectiveUser?.role);
  const [sheet, setSheet] = useState(() => sheets?.find((s) => s._id === id) || null);
  const [tabs, setTabs] = useState([]);
  const [activeGid, setActiveGid] = useState(null);
  const [tabsLoading, setTabsLoading] = useState(false);
  const cachedEntry = cache[cacheKey(id, activeGid)];
  const [data, setData] = useState(() => cachedEntry?.data || { headers: [], rows: [] });
  const [loading, setLoading] = useState(!cachedEntry);
  const isOwner = sheet && String(sheet.createdBy) === String(effectiveUser?._id);
  const canManageSheet = isAdmin || isOwner;
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [showFilters, setShowFilters] = useState(false);
  const filterBtnRef = useRef(null);
  const [dateColumn, setDateColumn] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ASC / DESC Column Sorting State
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // 'asc' or 'desc'

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/sheets/${id}`);
      invalidate(id);
      reloadSheets();
      navigate('/');
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const load = async ({ force = false, gid = activeGid } = {}) => {
    setErr('');
    const hasCache = !!cache[cacheKey(id, gid)];
    if (!hasCache) setLoading(true);
    else if (force) setRefreshing(true);
    try {
      if (!sheet || sheet._id !== id) {
        const fromList = sheets?.find((s) => s._id === id);
        if (fromList) setSheet(fromList);
        else {
          const meta = await api.get(`/sheets/${id}`);
          setSheet(meta.data);
        }
      }
      const fresh = await getSheetData(id, { force, gid: gid ?? undefined });
      setData(fresh);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTabs = async () => {
    setTabsLoading(true);
    try {
      const { data } = await api.get(`/sheets/${id}/tabs`);
      setTabs(data.tabs || []);
      if (!activeGid && data.tabs?.length > 0) {
        setActiveGid(data.tabs[0].gid);
      }
    } catch (e) {
      setTabs([{ gid: '0', name: 'Sheet1' }]);
      if (!activeGid) setActiveGid('0');
    } finally {
      setTabsLoading(false);
    }
  };

  useEffect(() => {
    const fromList = sheets?.find((s) => s._id === id);
    if (fromList) setSheet(fromList);
    setTabs([]);
    setActiveGid(null);
    loadTabs();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (activeGid === null) return;
    if (cache[cacheKey(id, activeGid)]) {
      setData(cache[cacheKey(id, activeGid)].data);
      setLoading(false);
    } else {
      load({ gid: activeGid });
    }
    // eslint-disable-next-line
  }, [id, activeGid]);

  const columnTypes = useMemo(
    () => detectColumnTypes(data.headers, data.rows),
    [data.headers, data.rows]
  );

  // Column Header Sort Toggle
  const handleHeaderClick = (colIdx) => {
    if (sortCol !== colIdx) {
      setSortCol(colIdx);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortCol(null);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let rows = [...data.rows];

    // 1. Search filter
    if (q.trim()) {
      const term = q.toLowerCase();
      rows = rows.filter((r) => r.some((c) => String(c).toLowerCase().includes(term)));
    }

    // 2. Date range filter
    if (dateColumn !== null && (dateFrom || dateTo)) {
      const from = fromDateInput(dateFrom, false);
      const to = fromDateInput(dateTo, true);
      rows = rows.filter((r) => {
        const d = parseDate(r[dateColumn]);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // 3. Column Sorting (Ascending / Descending)
    if (sortCol !== null && sortCol >= 0 && sortCol < data.headers.length) {
      const isNumType = columnTypes[sortCol] === 'number';
      const isDateType = columnTypes[sortCol] === 'date';

      rows.sort((rowA, rowB) => {
        const valA = rowA[sortCol] ?? '';
        const valB = rowB[sortCol] ?? '';

        const emptyA = valA === '' || valA === null || valA === undefined;
        const emptyB = valB === '' || valB === null || valB === undefined;
        if (emptyA && emptyB) return 0;
        if (emptyA) return 1;
        if (emptyB) return -1;

        let res = 0;

        if (isNumType) {
          const numA = parseFloat(String(valA).replace(/[^0-9.-]/g, ''));
          const numB = parseFloat(String(valB).replace(/[^0-9.-]/g, ''));
          if (!isNaN(numA) && !isNaN(numB)) {
            res = numA - numB;
          } else {
            res = String(valA).localeCompare(String(valB), undefined, { numeric: true });
          }
        } else if (isDateType) {
          const dateA = parseDate(valA);
          const dateB = parseDate(valB);
          if (dateA && dateB) {
            res = dateA.getTime() - dateB.getTime();
          } else {
            res = String(valA).localeCompare(String(valB), undefined, { numeric: true });
          }
        } else {
          res = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        }

        return sortDir === 'asc' ? res : -res;
      });
    }

    return rows;
  }, [q, data.rows, data.headers, dateColumn, dateFrom, dateTo, sortCol, sortDir, columnTypes]);

  const toggleMetric = (colIdx, metric) => {
    setSelectedMetrics((prev) => {
      const exists = prev.some((s) => s.colIdx === colIdx && s.metric === metric);
      if (exists) return prev.filter((s) => !(s.colIdx === colIdx && s.metric === metric));
      const others = prev.filter((s) => s.colIdx !== colIdx);
      return [...others, { colIdx, metric }];
    });
  };

  const clearFilters = () => {
    setDateColumn(null);
    setDateFrom('');
    setDateTo('');
    setSelectedMetrics([]);
  };

  const totals = useMemo(() => {
    return selectedMetrics.map(({ colIdx, metric }) => ({
      name: data.headers[colIdx],
      metric,
      value: aggregate(filtered, colIdx, metric),
    }));
  }, [selectedMetrics, filtered, data.headers]);

  useEffect(() => {
    clearFilters();
    setSortCol(null);
    setSortDir('asc');
    setShowFilters(false);
  }, [id, activeGid]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => { setPage(1); }, [q, id, pageSize, sortCol, sortDir]);


  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{sheet?.name || 'Loading...'}</h2>
          {sheet && (
            <a href={sheet.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
              Open in Google Sheets <ExternalLink size={12} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-100 rounded text-sm outline-none"
            />
          </div>
          <select
            value={syncInterval}
            onChange={(e) => setSyncInterval(parseInt(e.target.value, 10))}
            title="Auto-sync interval"
            className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded text-sm outline-none focus:border-indigo-400"
          >
            {SYNC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Auto-sync: {o.label}</option>
            ))}
          </select>
          <button
            onClick={() => { loadTabs(); load({ force: true, gid: activeGid }); }}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Now'}
          </button>
          <div className="relative" ref={filterBtnRef}>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-1 px-3 py-1.5 border rounded text-sm ${
                selectedMetrics.length > 0 || dateColumn !== null
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Filter and totals"
            >
              <Filter size={14} /> Filters
              {(selectedMetrics.length > 0 || dateColumn !== null) && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
            </button>
            {showFilters && data.headers.length > 0 && (
              <FilterPanel
                headers={data.headers}
                columnTypes={columnTypes}
                dateColumn={dateColumn}
                setDateColumn={setDateColumn}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                selectedMetrics={selectedMetrics}
                toggleMetric={toggleMetric}
                clearAll={clearFilters}
                onClose={() => setShowFilters(false)}
                anchorRef={filterBtnRef}
              />
            )}
          </div>
          {canManageSheet && sheet && (
            <>
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 dark:text-slate-200 rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Edit sheet"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white border border-red-600 rounded text-sm hover:bg-red-700"
                title="Delete sheet"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {err && <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 rounded text-sm">{err}</div>}

      {/* KPI Top Summary Cards */}
      {!loading && data.headers.length > 0 && (
        <KPICards headers={data.headers} rows={filtered} columnTypes={columnTypes} />
      )}

      {/* Tabs bar */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800">
          {tabsLoading && <span className="text-xs text-slate-400 px-3 py-2">Loading tabs...</span>}
          {tabs.map((t) => {
            const active = String(t.gid) === String(activeGid);
            return (
              <button
                key={t.gid}
                onClick={() => setActiveGid(t.gid)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap border-b-2 transition ${
                  active
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}

      {sortCol !== null && sortCol >= 0 && sortCol < data.headers.length && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-800 dark:text-indigo-200 w-fit">
          <span>
            Sorted by <strong>{data.headers[sortCol]}</strong> ({sortDir.toUpperCase() === 'ASC' ? 'Ascending ↑' : 'Descending ↓'})
          </span>
          <button
            onClick={() => { setSortCol(null); setSortDir('asc'); }}
            className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded transition"
            title="Clear column sort"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">Loading data...</div>
        ) : data.headers.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">No data in this sheet</div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                <tr>
                  {data.headers.map((h, i) => {
                    const isSorted = sortCol === i;
                    return (
                      <th
                        key={i}
                        onClick={() => handleHeaderClick(i)}
                        className={`group px-3 py-2.5 text-left font-semibold text-xs whitespace-nowrap cursor-pointer select-none transition ${
                          isSorted
                            ? 'bg-indigo-100/90 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                        }`}
                        title={`Click to sort by "${h}" (${isSorted ? (sortDir === 'asc' ? 'Ascending → Descending' : 'Descending → Reset') : 'Ascending'})`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{h}</span>
                          <div className="shrink-0">
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp size={14} className="text-indigo-600 dark:text-indigo-400 font-bold" />
                              ) : (
                                <ArrowDown size={14} className="text-indigo-600 dark:text-indigo-400 font-bold" />
                              )
                            ) : (
                              <ArrowUpDown size={13} className="text-slate-400 opacity-40 group-hover:opacity-100 transition" />
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr className="border-t border-slate-200 dark:border-slate-800">
                    <td colSpan={data.headers.length} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400">
                      {q.trim() ? `No results found for "${q}"` : 'No rows'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, i) => (
                    <tr key={pageStart + i} className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      {data.headers.map((_, j) => (
                        <td key={j} className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">{row[j] ?? ''}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>

              {/* Bottom / Last Summary Totals Row */}
              {filtered.length > 0 && (
                <tfoot className="bg-slate-100/95 dark:bg-slate-800/95 border-t-2 border-indigo-200 dark:border-indigo-800 sticky bottom-0 z-10 shadow-md">
                  <tr>
                    {data.headers.map((h, j) => {
                      if (j === 0) {
                        return (
                          <td key={j} className="px-3 py-2.5 whitespace-nowrap text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                            Total ({filtered.length} rows)
                          </td>
                        );
                      }
                      if (columnTypes[j] === 'number') {
                        let sum = 0;
                        let count = 0;
                        for (const r of filtered) {
                          const n = parseNumber(r[j]);
                          if (!isNaN(n)) {
                            sum += n;
                            count++;
                          }
                        }
                        return (
                          <td key={j} className="px-3 py-2.5 whitespace-nowrap text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                            {count > 0 ? formatNumber(sum, 'sum') : '—'}
                          </td>
                        );
                      }
                      return (
                        <td key={j} className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-400">
                          —
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>


      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>
              Showing <strong>{pageStart + 1}</strong>–<strong>{Math.min(pageStart + pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong>
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="ml-2 px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="px-2 text-slate-400 text-xs">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[28px] px-2 py-1 rounded text-xs font-medium ${
                    p === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Total: {filtered.length} row(s)</span>
        {cachedEntry?.fetchedAt && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Last synced: <TimeAgo ts={cachedEntry.fetchedAt} />
            {syncInterval > 0 && ` · auto every ${syncInterval < 60 ? `${syncInterval} min` : `${syncInterval / 60} hr`}`}
          </span>
        )}
      </div>

      <TotalsBar
        totals={totals}
        filteredCount={filtered.length}
        totalCount={data.rows.length}
        onClear={() => setSelectedMetrics([])}
      />

      {showEdit && sheet && (
        <AddSheetModal
          sheet={sheet}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); reloadSheets(); invalidate(id); loadTabs(); }}
        />
      )}

      <ConfirmModal
        open={showDelete}
        title="Delete Sheet?"
        message={`"${sheet?.name}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        tone="red"
        icon={<Trash2 size={20} />}
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
