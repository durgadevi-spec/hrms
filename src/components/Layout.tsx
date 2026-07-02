import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-surface-100 dark:bg-surface-950">
      {isAuthenticated && <Sidebar />}
      <div className={`transition-all duration-300 ${isAuthenticated ? 'lg:pl-72' : ''}`}>
        {isAuthenticated && <Header />}
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
