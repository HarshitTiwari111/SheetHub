import { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';

export default function AddSheetModal({ sheet, onClose, onSaved }) {
  const [name, setName] = useState(sheet?.name || '');
  const [url, setUrl] = useState(sheet?.url || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (sheet) await api.put(`/sheets/${sheet._id}`, { name, url });
      else await api.post('/sheets', { name, url });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <form onSubmit={submit} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <h2 className="text-lg font-semibold">{sheet ? 'Edit Sheet' : 'Add New Sheet'}</h2>
        {err && <div className="text-sm text-red-600 dark:text-red-400">{err}</div>}
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Sheet Name</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Data"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Google Sheet URL</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Share the sheet as "Anyone with the link — Viewer".
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
