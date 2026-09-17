import { Link, useOutletContext } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useImpersonation } from '../context/ImpersonationContext.jsx';

export default function Dashboard() {
  const { effectiveUser: user } = useImpersonation();
  const { sheets } = useOutletContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome, {user?.name} 👋</h2>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">You have {sheets.length} sheet{sheets.length === 1 ? '' : 's'} connected.</p>
      </div>

      {sheets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-10 text-center">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-slate-700 dark:text-slate-200 font-medium">No sheets yet</div>
          <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {user?.role === 'admin'
              ? 'Sidebar me "Add Page" click karke apna pehla sheet add karo.'
              : 'Admin se sheets add karne ke liye kaho.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((s) => (
            <Link
              key={s._id}
              to={`/sheet/${s._id}`}
              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded"><FileText size={20} /></div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">Click to view data</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
