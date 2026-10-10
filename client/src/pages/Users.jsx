import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import { useAuth, ROLES, ROLE_LABEL, canManage } from '../context/AuthContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => api.get('/users').then((r) => setUsers(r.data));
  useEffect(() => {
    load();
  }, []);

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteUser._id}`);
      setDeleteUser(null);
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const canEditRow = (u) => u._id === me._id || canManage(me.role, u.role);
  const canDeleteRow = (u) => u._id !== me._id && canManage(me.role, u.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={24} /> 4-Tier User & RBAC Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Super Admin, Admin, Manager, and Employee security roles & access privileges
          </p>
        </div>
        <button
          onClick={() => {
            setEdit(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow"
        >
          <Plus size={16} /> Add New User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm min-w-[550px]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">User</th>
              <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Email</th>
              <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Security Role</th>
              <th className="text-left px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">2FA Security</th>
              <th className="text-right px-4 py-3 text-slate-700 dark:text-slate-200 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-3">
                  {u.twoFactorEnabled ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck size={12} /> 2FA Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {canEditRow(u) && (
                      <button
                        onClick={() => {
                          setEdit(u);
                          setShowForm(true);
                        }}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-400 rounded-lg transition"
                        title="Edit user"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {canDeleteRow(u) ? (
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-400 rounded-lg transition"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      u._id === me._id && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 rounded">
                          You
                        </span>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm
          user={edit}
          me={me}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteUser}
        title="Delete User?"
        message={`"${deleteUser?.name}" (${deleteUser?.email}) will be permanently removed. Their refresh tokens and sessions will be revoked immediately.`}
        confirmText="Yes, Delete User"
        cancelText="Cancel"
        tone="red"
        icon={<Trash2 size={20} />}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteUser(null)}
      />
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    superadmin: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    admin: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
    manager: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    employee: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    user: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 font-medium rounded-full border ${map[role] || map.employee}`}>
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function UserForm({ user, me, onClose, onSaved }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'employee');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const payload = { name, email, role };
      if (password) payload.password = password;
      if (user) await api.put(`/users/${user._id}`, payload);
      else {
        if (!password) throw new Error('Password required');
        await api.post('/users', { ...payload, password });
      }
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <form
        onSubmit={submit}
        autoComplete="off"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <h3 className="text-lg font-bold">{user ? 'Edit User Security Profile' : 'Add New User'}</h3>
        {err && (
          <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 rounded-lg p-3 border border-rose-200 dark:border-rose-800">
            {err}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
          <input
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="e.g. Sarah Connor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
          <input
            type="email"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="sarah@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder={user ? 'Leave blank to keep current' : 'Min 6 characters'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role Privilege</label>
          <select
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 font-medium"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition shadow"
          >
            {busy ? 'Saving...' : 'Save User'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
