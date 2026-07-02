import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Moon, Sun, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatRelativeTime } from '../utils/formatters';
import type { Notification } from '../types';

export default function Header() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (user) {
      api.get('/api/notifications').then(setNotifications).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userNotifications = notifications.slice(0, 6);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await api.put(`/api/notifications/${notification.id}/read`).catch(console.error);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setNotificationOpen(false);
  };

  const handleMarkAllRead = async () => {
    await api.put('/api/notifications/read-all').catch(console.error);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-4 flex-1">
          {searchOpen ? (
            <div className="flex-1 max-w-md animate-fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search employees, projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  autoFocus
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded">
                  <X className="w-4 h-4 text-secondary-400" />
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm text-secondary-400 hover:text-secondary-600 w-64 max-w-xs">
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-600 dark:text-surface-300">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div ref={notificationRef} className="relative">
            <button onClick={() => setNotificationOpen(!notificationOpen)} className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-600 dark:text-surface-300">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full"></span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl shadow-lg animate-fade-in-down">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-800">
                  <h3 className="font-semibold text-secondary-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="divide-y divide-surface-100 dark:divide-surface-800 max-h-72 overflow-y-auto">
                  {userNotifications.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-secondary-400 text-sm">
                      <span>No notifications</span>
                    </div>
                  ) : (
                    userNotifications.map(notification => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 mt-2 rounded-full ${!notification.isRead ? 'bg-primary-500' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.isRead ? 'font-medium text-secondary-900 dark:text-white' : 'text-secondary-600 dark:text-surface-300'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-secondary-500 mt-0.5">{notification.message}</p>
                            <p className="text-xs text-secondary-400 mt-1">{formatRelativeTime(notification.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-surface-100 dark:border-surface-800">
                  <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pl-4 ml-2 border-l border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 font-semibold dark:text-primary-400">
              {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-secondary-900 dark:text-white">{user?.firstName}</p>
              <p className="text-xs text-secondary-500 dark:text-surface-400">{user?.designation}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
