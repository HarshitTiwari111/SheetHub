import { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';

export default function ChangePasswordModal({ onClose }) {
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (newPassword.length < 6) return setErr('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setErr('New passwords do not match');
    if (newPassword === oldPassword) return setErr('New password must be different from old');
    setBusy(true);
    try {
      await api.put('/auth/change-password', { oldPassword, newPassword });
      setMsg('Password changed successfully. Please log in again.');
      setOld(''); setNew(''); setConfirm('');
      setTimeout(() => { onClose(); }, 1500);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const PwInput = ({ value, onChange, placeholder, show, setShow, autoFocus }) => (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        autoFocus={autoFocus}
        required
        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-indigo-400"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <form onSubmit={submit} autoComplete="off" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <h3 className="text-lg font-semibold">Change Password</h3>
        </div>

        {msg && <div className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 rounded-md p-2">{msg}</div>}
        {err && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-md p-2">{err}</div>}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
          <PwInput value={oldPassword} onChange={(e) => setOld(e.target.value)} placeholder="Enter current password" show={showOld} setShow={setShowOld} autoFocus />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
          <PwInput value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="Min 6 characters" show={showNew} setShow={setShowNew} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
          <PwInput value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" show={showNew} setShow={setShowNew} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={busy || !!msg} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
            {busy ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
