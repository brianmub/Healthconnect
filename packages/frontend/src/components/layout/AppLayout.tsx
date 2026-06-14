import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Users,
  Send,
  FileCode,
  Calendar,
  Zap,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Activity
} from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'Campaigns', href: '/campaigns', icon: Send },
    { name: 'Templates', href: '/templates', icon: FileCode },
    { name: 'Appointments', href: '/appointments', icon: Calendar },
    { name: 'Automation', href: '/automation', icon: Zap },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-slate-100">
      {/* ==========================================
          Desktop Sidebar
          ========================================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900/40 border-r border-slate-800/60 backdrop-blur-md shrink-0">
        {/* Brand Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800/60">
          <Activity className="h-6 w-6 text-primary-500 animate-pulse" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary-500 to-sky-400 bg-clip-text text-transparent">
            HealthConnect
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.25)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/20">
              <span className="text-sm font-semibold text-primary-500 uppercase">
                {user?.name?.substring(0, 2) || 'US'}
              </span>
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-danger-500 hover:text-danger-400 border border-danger-500/10 hover:border-danger-400/20 bg-danger-500/5 hover:bg-danger-500/10 rounded-lg transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ==========================================
          Mobile Header & Top Navigation
          ========================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-800/60 bg-slate-900/20 backdrop-blur-md sticky top-0 z-40">
          {/* Mobile Menu Trigger & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Activity className="h-5 w-5 text-primary-500" />
              <span className="text-md font-bold tracking-tight bg-gradient-to-r from-primary-500 to-sky-400 bg-clip-text text-transparent">
                HealthConnect
              </span>
            </div>
            <span className="hidden lg:inline text-sm font-medium text-slate-400">
              SmileCare Dental Practice Dashboard
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
              <Bell className="h-4 w-4" />
            </button>

            {/* Notification drop down */}
            {notificationsOpen && (
              <div className="absolute right-0 top-10 w-72 glass-panel rounded-xl shadow-2xl p-4 border border-slate-800 z-50 animate-fade-in text-xs">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-300">System Notifications</span>
                  <button onClick={() => setNotificationsOpen(false)} className="text-slate-500 hover:text-slate-300">Close</button>
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-slate-800/30 rounded border border-slate-800/50">
                    <p className="font-semibold text-slate-200">System Ready</p>
                    <p className="text-slate-400 mt-0.5">HealthConnect message pipelines are operating normally.</p>
                  </div>
                  <div className="p-2 bg-slate-800/30 rounded border border-slate-800/50">
                    <p className="font-semibold text-slate-200">Active Automations</p>
                    <p className="text-slate-400 mt-0.5">3 rules are currently active for upcoming checkups.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-500/10 flex items-center justify-center border border-primary-500/20 text-xs font-bold text-primary-400 uppercase">
                {user?.name?.substring(0, 2) || 'US'}
              </div>
            </div>
          </div>
        </header>

        {/* ==========================================
            Main Content Workspace
            ========================================== */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ==========================================
          Mobile Side Menu Drawer (Slide-out)
          ========================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Drawer Panel */}
          <aside className="relative flex flex-col w-72 max-w-xs bg-slate-900 border-r border-slate-800 p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-500" />
                <span className="text-lg font-bold text-slate-100">HealthConnect</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.25)]'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-6 border-t border-slate-800 mt-auto">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-danger-500 hover:text-danger-400 border border-danger-500/10 hover:border-danger-400/20 bg-danger-500/5 hover:bg-danger-500/10 rounded-lg transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ==========================================
          Mobile Bottom Tab Bar (Quick Access)
          ========================================== */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800/60 lg:hidden flex items-center justify-around px-4 z-40">
        {navigation.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all ${
                active ? 'text-primary-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
