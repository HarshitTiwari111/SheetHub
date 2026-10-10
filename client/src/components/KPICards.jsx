import { useMemo } from 'react';
import { DollarSign, TrendingUp, BarChart3, Globe, Award, Coins } from 'lucide-react';
import { parseNumber, formatNumber } from '../utils/columnAnalysis';

export default function KPICards({ headers = [], rows = [], columnTypes = {} }) {
  const kpis = useMemo(() => {
    if (!headers || headers.length === 0 || !rows) return [];

    const totalCount = rows.length;

    // 1. Total Conversions / Records
    const countCard = {
      title: 'Total Conversions',
      value: totalCount.toLocaleString('en-IN'),
      subtext: 'Total records in view',
      icon: TrendingUp,
      tone: 'indigo',
    };

    if (totalCount === 0) {
      return [
        countCard,
        { title: 'Total Payout', value: '—', subtext: 'No data', icon: DollarSign, tone: 'emerald' },
        { title: 'Avg Sale Amount', value: '—', subtext: 'No data', icon: BarChart3, tone: 'amber' },
        { title: 'Top Country / Category', value: '—', subtext: 'No data', icon: Globe, tone: 'sky' },
      ];
    }

    // 2. Identify Numeric Columns
    const numericColIndices = headers
      .map((h, i) => (columnTypes[i] === 'number' ? i : -1))
      .filter((i) => i !== -1);

    // Find Payout / Revenue / Sum Column
    let payoutColIdx = headers.findIndex(
      (h, i) => columnTypes[i] === 'number' && /payout|pay|revenue|income|sales|amount|commission|cost/i.test(h)
    );
    if (payoutColIdx === -1 && numericColIndices.length > 0) payoutColIdx = numericColIndices[0];

    // Find Sale Amount / Secondary Numeric Column
    let saleColIdx = headers.findIndex(
      (h, i) => i !== payoutColIdx && columnTypes[i] === 'number' && /sale|amount|price|ticket|value/i.test(h)
    );
    if (saleColIdx === -1 && numericColIndices.length > 1) {
      saleColIdx = numericColIndices.find((i) => i !== payoutColIdx);
    }

    // Detect currency symbol from sample cells
    const detectCurrency = (colIdx) => {
      if (colIdx === undefined || colIdx === -1) return '';
      for (const row of rows.slice(0, 20)) {
        const str = String(row[colIdx] || '');
        if (str.includes('$')) return '$';
        if (str.includes('₹')) return '₹';
        if (str.includes('€')) return '€';
        if (str.includes('£')) return '£';
      }
      return '$';
    };

    // Card 2: Total Payout / Sum
    let payoutCard;
    if (payoutColIdx !== undefined && payoutColIdx !== -1) {
      const colName = headers[payoutColIdx];
      const currency = detectCurrency(payoutColIdx);
      let sum = 0;
      let validCount = 0;
      for (const r of rows) {
        const n = parseNumber(r[payoutColIdx]);
        if (!isNaN(n)) {
          sum += n;
          validCount++;
        }
      }
      payoutCard = {
        title: colName.length > 25 ? 'Total Payout' : `Total ${colName}`,
        value: `${currency}${formatNumber(sum, 'sum')}`,
        subtext: `Sum over ${validCount.toLocaleString('en-IN')} entries`,
        icon: Coins,
        tone: 'emerald',
      };
    } else {
      payoutCard = {
        title: 'Total Payout',
        value: '—',
        subtext: 'No numeric columns',
        icon: DollarSign,
        tone: 'emerald',
      };
    }

    // Card 3: Avg Sale Amount / Average Metric
    let avgCard;
    const avgTargetIdx = saleColIdx !== undefined && saleColIdx !== -1 ? saleColIdx : payoutColIdx;

    if (avgTargetIdx !== undefined && avgTargetIdx !== -1) {
      const colName = headers[avgTargetIdx];
      const currency = detectCurrency(avgTargetIdx);
      let sum = 0;
      let count = 0;
      for (const r of rows) {
        const n = parseNumber(r[avgTargetIdx]);
        if (!isNaN(n)) {
          sum += n;
          count++;
        }
      }
      const avg = count > 0 ? sum / count : 0;
      avgCard = {
        title: colName.length > 25 ? 'Avg Sale Amount' : `Avg ${colName}`,
        value: `${currency}${formatNumber(avg, 'avg')}`,
        subtext: `Average per record`,
        icon: BarChart3,
        tone: 'amber',
      };
    } else {
      avgCard = {
        title: 'Average Amount',
        value: '—',
        subtext: 'No numeric columns',
        icon: BarChart3,
        tone: 'amber',
      };
    }

    // Card 4: Top Country / Category / Dimension
    let topColIdx = headers.findIndex(
      (h, i) => columnTypes[i] === 'text' && /country|nation|location|offer|campaign|browser|status|device|name|category/i.test(h)
    );
    if (topColIdx === -1) {
      topColIdx = headers.findIndex((h, i) => columnTypes[i] === 'text');
    }

    let topCard;
    if (topColIdx !== -1) {
      const colName = headers[topColIdx];
      const freqMap = {};
      let totalValid = 0;

      for (const r of rows) {
        const v = String(r[topColIdx] || '').trim();
        if (v && v !== '—' && v !== 'N/A') {
          freqMap[v] = (freqMap[v] || 0) + 1;
          totalValid++;
        }
      }

      let topVal = '';
      let topFreq = 0;
      for (const [val, freq] of Object.entries(freqMap)) {
        if (freq > topFreq) {
          topVal = val;
          topFreq = freq;
        }
      }

      const pct = totalValid > 0 ? Math.round((topFreq / totalValid) * 100) : 0;

      topCard = {
        title: `Top ${colName.replace(/\./g, ' ')}`,
        value: topVal || '—',
        subtext: topFreq > 0 ? `${topFreq.toLocaleString('en-IN')} (${pct}% of total)` : 'No entries',
        icon: /country|location/i.test(colName) ? Globe : Award,
        tone: 'sky',
      };
    } else {
      topCard = {
        title: 'Top Category',
        value: '—',
        subtext: 'No text columns',
        icon: Globe,
        tone: 'sky',
      };
    }

    return [countCard, payoutCard, avgCard, topCard];
  }, [headers, rows, columnTypes]);

  if (!headers || headers.length === 0) return null;

  const toneMap = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80',
      iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30',
      title: 'text-indigo-600 dark:text-indigo-400',
      val: 'text-indigo-950 dark:text-indigo-100',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80',
      iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30',
      title: 'text-emerald-600 dark:text-emerald-400',
      val: 'text-emerald-950 dark:text-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80',
      iconBg: 'bg-amber-600 text-white shadow-amber-600/30',
      title: 'text-amber-600 dark:text-amber-400',
      val: 'text-amber-950 dark:text-amber-100',
    },
    sky: {
      bg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/80',
      iconBg: 'bg-sky-600 text-white shadow-sky-600/30',
      title: 'text-sky-600 dark:text-sky-400',
      val: 'text-sky-950 dark:text-sky-100',
    },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        const style = toneMap[kpi.tone] || toneMap.indigo;
        return (
          <div
            key={idx}
            className={`border rounded-2xl p-4 transition-all duration-200 hover:shadow-md ${style.bg}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className={`text-xs font-bold uppercase tracking-wider block truncate ${style.title}`}>
                  {kpi.title}
                </span>
                <div className={`text-lg sm:text-xl font-extrabold mt-1 truncate ${style.val}`}>
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {kpi.subtext}
                </div>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${style.iconBg}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
