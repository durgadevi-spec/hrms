import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DepartmentsProvider } from './context/DepartmentsContext';
import { AssetsProvider } from './context/AssetsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Managers from './pages/Managers';
import Projects from './pages/Projects';
import Timesheets from './pages/Timesheets';
import Leaves from './pages/Leaves';
import Assets from './pages/Assets';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  const homePath = isAdmin ? '/admin' : `/profile/${user?.id}`;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />} />
      <Route path="/signup" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Signup />} />
      <Route element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/managers" element={<Managers />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? homePath : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DepartmentsProvider>
            <AssetsProvider>
              <AppRoutes />
            </AssetsProvider>
          </DepartmentsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}