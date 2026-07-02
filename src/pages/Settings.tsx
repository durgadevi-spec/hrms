import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell, Shield, Palette, Mail, Save, ChevronRight } from 'lucide-react';
import { cn } from '../utils/formatters';

const settingSections = [
  { id: 'account', label: 'Account', icon: Mail },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function Settings() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('account');

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weeklyReport: true,
    leaveUpdates: true,
    taskUpdates: true,
    timesheetReminders: true,
  });

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Settings</h1>
        <p className="text-secondary-600 dark:text-surface-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 flex-shrink-0">
          <div className="card p-2">
            {settingSections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-secondary-600 hover:bg-surface-50 dark:hover:bg-surface-800'
                )}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {activeSection === 'account' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6">Account Settings</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">First Name</label>
                    <input type="text" defaultValue={user?.firstName} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1.5">Last Name</label>
                    <input type="text" defaultValue={user?.lastName} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1.5">Email Address</label>
                  <input type="email" defaultValue={user?.email} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1.5">Phone Number</label>
                  <input type="tel" defaultValue={user?.phone || ''} placeholder="+1-555-0100" className="input-field" />
                </div>
                <div className="pt-4">
                  <button className="btn-primary">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6">Security Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-secondary-900 dark:text-white mb-2">Change Password</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-secondary-600 mb-1">Current Password</label>
                      <input type="password" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm text-secondary-600 mb-1">New Password</label>
                      <input type="password" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm text-secondary-600 mb-1">Confirm New Password</label>
                      <input type="password" className="input-field" />
                    </div>
                  </div>
                </div>
                <button className="btn-primary">Update Password</button>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6">Appearance Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-secondary-900 dark:text-white mb-3">Theme</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => !isDark || toggleTheme()}
                      className={cn(
                        'flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all',
                        !isDark ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'
                      )}
                    >
                      <Sun className="w-5 h-5 text-warning-500" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => isDark || toggleTheme()}
                      className={cn(
                        'flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all',
                        isDark ? 'border-primary-500 bg-primary-900/30' : 'border-secondary-200 hover:border-secondary-300'
                      )}
                    >
                      <Moon className="w-5 h-5 text-primary-400" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-secondary-900 dark:text-white mb-3">Language</h3>
                  <select className="input-field">
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                  { key: 'push', label: 'Push Notifications', desc: 'Receive push notifications in browser' },
                  { key: 'weeklyReport', label: 'Weekly Summary', desc: 'Get weekly activity report' },
                  { key: 'leaveUpdates', label: 'Leave Updates', desc: 'Notifications about leave approvals' },
                  { key: 'taskUpdates', label: 'Task Updates', desc: 'Notifications about task assignments' },
                  { key: 'timesheetReminders', label: 'Timesheet Reminders', desc: 'Reminders to fill timesheets' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-secondary-500 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors',
                        notifications[item.key as keyof typeof notifications] ? 'bg-primary-600' : 'bg-secondary-300'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                        notifications[item.key as keyof typeof notifications] && 'translate-x-5'
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
