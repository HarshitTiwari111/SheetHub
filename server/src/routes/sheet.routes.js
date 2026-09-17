const router = require('express').Router();
const axios = require('axios');
const { body, param } = require('express-validator');
const xssFilters = require('xss');
const Sheet = require('../models/Sheet');
const { protect, adminLevel } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { audit } = require('../utils/audit');

router.use(protect);

// Admin sees all, users see only their own
const scopeFilter = (user) => (user.role === 'admin' ? {} : { createdBy: user._id });

const canAccessSheet = (user, sheet) =>
  user.role === 'admin' || String(sheet.createdBy) === String(user._id);

router.get('/', async (req, res) => {
  const sheets = await Sheet.find(scopeFilter(req.user)).sort({ order: 1, createdAt: 1 });
  res.json(sheets);
});

router.get('/:id', param('id').isMongoId(), validate, async (req, res) => {
  const sheet = await Sheet.findById(req.params.id);
  if (!sheet) return res.status(404).json({ message: 'Sheet not found' });
  if (!canAccessSheet(req.user, sheet)) return res.status(403).json({ message: 'Access denied' });
  res.json(sheet);
});

router.get('/:id/data', param('id').isMongoId(), validate, async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });
    if (!canAccessSheet(req.user, sheet)) return res.status(403).json({ message: 'Access denied' });

    const gidOverride = req.query.gid;
    const csvUrl = toCsvUrl(sheet.url, gidOverride);
    if (!csvUrl)
      return res.status(400).json({
        message: 'Invalid Google Sheet URL. Share the sheet as "Anyone with link — Viewer".',
      });

    const { data } = await axios.get(csvUrl, { responseType: 'text', timeout: 15000 });
    const rows = parseCsv(data);
    const headers = (rows.shift() || []).map((h) => xssFilters(String(h)));
    const cleanRows = rows.map((r) => r.map((v) => xssFilters(String(v ?? ''))));
    res.json({ headers, rows: cleanRows, count: cleanRows.length });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to load sheet data. Check that the sheet is public (Anyone with link — Viewer).',
      error: err.message,
    });
  }
});

// Fetch all tabs (sub-sheets) from a Google Sheet
router.get('/:id/tabs', param('id').isMongoId(), validate, async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });
    if (!canAccessSheet(req.user, sheet)) return res.status(403).json({ message: 'Access denied' });

    const spreadsheetId = extractSpreadsheetId(sheet.url);
    if (!spreadsheetId) return res.status(400).json({ message: 'Invalid sheet URL' });

    const tabs = await fetchTabs(spreadsheetId);
    res.json({ tabs });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch tabs. Ensure the sheet is public (Anyone with link — Viewer).',
      error: err.message,
    });
  }
});

router.post(
  '/',
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('url').isURL({ protocols: ['http', 'https'], require_protocol: true }).contains('docs.google.com/spreadsheets'),
  body('icon').optional().isString().isLength({ max: 40 }),
  body('order').optional().isInt(),
  validate,
  async (req, res) => {
    const sheet = await Sheet.create({
      name: req.body.name,
      url: req.body.url,
      icon: req.body.icon || 'FileText',
      order: req.body.order || 0,
      createdBy: req.user._id,
    });
    audit(req, { action: 'sheet.create', resourceType: 'Sheet', resourceId: sheet._id, details: { name: sheet.name } });
    res.status(201).json(sheet);
  }
);

router.put(
  '/:id',
  param('id').isMongoId(),
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('url').optional().isURL().contains('docs.google.com/spreadsheets'),
  body('icon').optional().isString().isLength({ max: 40 }),
  body('order').optional().isInt(),
  validate,
  async (req, res) => {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });
    if (!canAccessSheet(req.user, sheet)) return res.status(403).json({ message: 'Access denied' });
    const before = { name: sheet.name, url: sheet.url };
    ['name', 'url', 'icon', 'order'].forEach((k) => {
      if (req.body[k] !== undefined) sheet[k] = req.body[k];
    });
    await sheet.save();
    audit(req, { action: 'sheet.update', resourceType: 'Sheet', resourceId: sheet._id, details: { before, after: { name: sheet.name, url: sheet.url } } });
    res.json(sheet);
  }
);

router.delete('/:id', param('id').isMongoId(), validate, async (req, res) => {
  const sheet = await Sheet.findById(req.params.id);
  if (!sheet) return res.status(404).json({ message: 'Sheet not found' });
  if (!canAccessSheet(req.user, sheet)) return res.status(403).json({ message: 'Access denied' });
  await Sheet.deleteOne({ _id: sheet._id });
  audit(req, { action: 'sheet.delete', resourceType: 'Sheet', resourceId: sheet._id, details: { name: sheet.name } });
  res.json({ message: 'Sheet deleted' });
});

function extractSpreadsheetId(url) {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function toCsvUrl(url, gidOverride) {
  const id = extractSpreadsheetId(url);
  if (!id) return null;
  let gid = gidOverride;
  if (gid === undefined || gid === null || gid === '') {
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    gid = gidMatch ? gidMatch[1] : '0';
  }
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

async function fetchTabs(spreadsheetId) {
  const results = [];
  const seen = new Set();

  const addTab = (gid, name) => {
    const g = String(gid);
    if (g === '-1' || !name) return;
    const cleaned = name
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0026/g, '&')
      .replace(/\\"/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const key = g;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ gid: g, name: cleaned });
  };

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

  // Method 1: htmlview — most reliable for anyone-with-link sheets.
  // Contains: items.push({name: "Sheet1", pageUrl: "...", gid: "0", initialSheet: ...})
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
    const { data: html } = await axios.get(url, {
      responseType: 'text',
      timeout: 15000,
      headers: { 'User-Agent': userAgent },
      maxRedirects: 5,
    });
    const re = /items\.push\(\{\s*name:\s*"([^"]+)"[^}]*?gid:\s*"(-?\d+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) addTab(m[2], m[1]);
  } catch {}

  // Method 2: pubhtml (only works if sheet is published to web)
  if (results.length === 0) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pubhtml`;
      const { data: html } = await axios.get(url, {
        responseType: 'text',
        timeout: 10000,
        headers: { 'User-Agent': userAgent },
      });
      const re = /<li[^>]*id="sheet-button-(\d+)"[^>]*>([^<]+)<\/li>/g;
      let m;
      while ((m = re.exec(html)) !== null) addTab(m[1], m[2]);
    } catch {}
  }

  if (results.length === 0) {
    results.push({ gid: '0', name: 'Sheet1' });
  }

  return results;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v && v.trim() !== ''));
}

module.exports = router;
