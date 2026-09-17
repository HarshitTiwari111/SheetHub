import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';
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
  useEffect(() => { load(); }, []);

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
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">User Management</h2>
        <button
          onClick={() => { setEdit(null); setShowForm(true); }}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Name</th>
              <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Email</th>
              <th className="text-left px-4 py-2 text-slate-700 dark:text-slate-200">Role</th>
              <th className="text-right px-4 py-2 text-slate-700 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{u.name}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{u.email}</td>
                <td className="px-4 py-2">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    {canEditRow(u) && (
                      <button
                        onClick={() => { setEdit(u); setShowForm(true); }}
                        className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-400 rounded-md"
                        title="Edit user"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {canDeleteRow(u) ? (
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-400 rounded-md"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      u._id === me._id && (
                        <span className="text-xs text-slate-400 italic">You</span>
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
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <ConfirmModal
        open={!!deleteUser}
        title="Delete User?"
        message={`"${deleteUser?.name}" (${deleteUser?.email}) will be permanently deleted. This action cannot be undone.`}
        confirmText="Yes, Delete"
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
    admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    user: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${map[role] || map.user}`}>
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function UserForm({ user, me, onClose, onSaved }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'user');
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
      <form onSubmit={submit} autoComplete="off" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-2xl">
        <h3 className="text-lg font-semibold">{user ? 'Edit User' : 'Add User'}</h3>
        {err && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-md p-2">{err}</div>}

        {/* Hidden dummy fields to trick browser autofill */}
        <input type="text" name="fake-username" autoComplete="username" className="hidden" tabIndex={-1} />
        <input type="password" name="fake-password" autoComplete="current-password" className="hidden" tabIndex={-1} />

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
          <input
            name="user_name_field"
            autoComplete="off"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            name="user_email_field"
            autoComplete="off"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            name="user_password_field"
            autoComplete="new-password"
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            placeholder={user ? 'Leave blank to keep current' : 'Min 6 characters'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
          <select
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
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
