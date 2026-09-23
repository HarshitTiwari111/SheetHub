// Parse a value as a number. Strips currency symbols, commas, %, and whitespace.
// Rejects strings with letters or internal hyphens (like "123-456-7890") to avoid
// mistaking IDs and phone numbers for numeric values.
export function parseNumber(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return NaN;
  if (/[a-zA-Z]/.test(s)) return NaN;
  const cleaned = s.replace(/[₹$€£,\s]/g, '').replace(/%$/, '');
  if (/-.*\d/.test(cleaned.slice(1))) return NaN; // dash after any digit → not a number
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function monthIndex(name) {
  return MONTH_MAP[name.slice(0, 3).toLowerCase()];
}

// Try multiple common date formats. Returns a Date or null.
// Rejects pure numbers (like "12345") that JS's Date parser would misinterpret as years.
export function parseDate(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (!s) return null;

  if (/^-?\d+(\.\d+)?$/.test(s)) return null;

  // DD-MM-YYYY or DD/MM/YYYY (optionally with time)
  let m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, dd, mm, yy, h, mi, se] = m;
    const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
    const d = new Date(year, Number(mm) - 1, Number(dd), Number(h || 0), Number(mi || 0), Number(se || 0));
    return isNaN(d) ? null : d;
  }

  // YYYY-MM-DD (ISO-ish)
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, y, mm, dd, h, mi, se] = m;
    const d = new Date(Number(y), Number(mm) - 1, Number(dd), Number(h || 0), Number(mi || 0), Number(se || 0));
    return isNaN(d) ? null : d;
  }

  // "11 September" or "11 September 2026" or "11-Sep-2026"
  m = s.match(/^(\d{1,2})[\s-]+([A-Za-z]+)(?:[\s-,]+(\d{2,4}))?$/);
  if (m) {
    const [, dd, monName, yy] = m;
    const mo = monthIndex(monName);
    if (mo !== undefined) {
      const year = yy
        ? (yy.length === 2 ? 2000 + Number(yy) : Number(yy))
        : new Date().getFullYear();
      const d = new Date(year, mo, Number(dd));
      return isNaN(d) ? null : d;
    }
  }

  // "September 11" or "September 11, 2026" or "Sep 11 2026"
  m = s.match(/^([A-Za-z]+)[\s-]+(\d{1,2})(?:[\s-,]+(\d{2,4}))?$/);
  if (m) {
    const [, monName, dd, yy] = m;
    const mo = monthIndex(monName);
    if (mo !== undefined) {
      const year = yy
        ? (yy.length === 2 ? 2000 + Number(yy) : Number(yy))
        : new Date().getFullYear();
      const d = new Date(year, mo, Number(dd));
      return isNaN(d) ? null : d;
    }
  }

  return null;
}

const ID_HEADER = /\b(id|code|phone|mobile|zip|pin|postal|no|number|reference|ref|sku|isbn|gtin|upc|ean|imei|passport|pan|aadhaar|aadhar)\b/i;

// Detects strings that look like identifiers rather than measured numbers:
//   "123-456-7890", "AB123", "PIN-4021", "1234 5678 9012" (spaced groups).
function looksLikeIdentifier(s) {
  if (!s) return false;
  if (/[a-zA-Z]/.test(s)) return true;
  if (/\d[- ]\d/.test(s)) return true;
  return false;
}

// Classify each column as 'number', 'date', or 'text' based on sample rows.
// Requires a high match ratio and rejects columns that mix identifiers with plain digits.
export function detectColumnTypes(headers, rows) {
  const types = {};
  const sampleSize = Math.min(rows.length, 50);
  headers.forEach((h, colIdx) => {
    if (ID_HEADER.test(h)) {
      types[colIdx] = 'text';
      return;
    }

    let numCount = 0;
    let dateCount = 0;
    let idLike = 0;
    let nonEmpty = 0;
    for (let i = 0; i < sampleSize; i++) {
      const v = rows[i]?.[colIdx];
      const s = v === undefined || v === null ? '' : String(v).trim();
      if (!s) continue;
      nonEmpty++;
      if (looksLikeIdentifier(s)) idLike++;
      if (!isNaN(parseNumber(v))) numCount++;
      if (parseDate(v)) dateCount++;
    }
    if (nonEmpty === 0) {
      types[colIdx] = 'text';
      return;
    }
    const numRatio = numCount / nonEmpty;
    const dateRatio = dateCount / nonEmpty;

    if (dateRatio >= 0.7 && dateRatio >= numRatio) {
      types[colIdx] = 'date';
      return;
    }
    // If any sampled value looks like an ID, don't treat as numeric — mixed ID columns
    // (e.g. "123-456-7890" alongside "843545") are identifiers, not measurements.
    if (idLike > 0) {
      types[colIdx] = 'text';
      return;
    }
    if (numRatio >= 0.8) {
      types[colIdx] = 'number';
      return;
    }
    types[colIdx] = 'text';
  });
  return types;
}

// Compute an aggregate (sum/avg/min/max/count) over a column of rows.
export function aggregate(rows, colIdx, metric) {
  const values = [];
  for (const row of rows) {
    const n = parseNumber(row[colIdx]);
    if (!isNaN(n)) values.push(n);
  }
  if (metric === 'count') return values.length;
  if (values.length === 0) return null;
  if (metric === 'sum') return values.reduce((a, b) => a + b, 0);
  if (metric === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
  if (metric === 'min') return Math.min(...values);
  if (metric === 'max') return Math.max(...values);
  return null;
}

// Format a number for display with thousand separators.
export function formatNumber(n, metric) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (metric === 'count') return n.toLocaleString('en-IN');
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
  });
}

// Format a Date as YYYY-MM-DD for <input type="date">.
export function toDateInput(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse YYYY-MM-DD from <input type="date">.
export function fromDateInput(s, endOfDay = false) {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}
