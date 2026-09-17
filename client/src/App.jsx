import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, isAdminLevel } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SheetView from './pages/SheetView.jsx';
import Users from './pages/Users.jsx';
import Profile from './pages/Profile.jsx';
import AuditLogs from './pages/AuditLogs.jsx';

function Protected({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdminLevel(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sheet/:id" element={<SheetView />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<Protected adminOnly><Users /></Protected>} />
        <Route path="/audit" element={<Protected adminOnly><AuditLogs /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
