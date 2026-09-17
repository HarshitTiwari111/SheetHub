import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'red',
  icon = <AlertTriangle size={22} />,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const toneMap = {
    red: {
      iconBg: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
      btn: 'bg-red-600 hover:bg-red-700',
    },
    indigo: {
      iconBg: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400',
      btn: 'bg-indigo-600 hover:bg-indigo-700',
    },
    amber: {
      iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-700',
    },
  };
  const t = toneMap[tone] || toneMap.red;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeIn_0.15s_ease-out]">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 shrink-0 rounded-full ${t.iconBg} flex items-center justify-center`}>
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">{message}</p>
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${t.btn}`}
          >
            {busy ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
