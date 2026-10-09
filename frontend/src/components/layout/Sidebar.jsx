import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Users, Truck, QrCode, Bell,
  BarChart3, Shield, LogOut, ChevronLeft, Menu, X, Box
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../api/client';

const roleNavItems = {
  provider: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/donations', icon: Package, label: 'My Donations' },
    { to: '/donations/new', icon: Package, label: 'Post Donation' },
    { to: '/notifications', icon: Bell, label: 'Notifications', hasBadge: true },
    { to: '/analytics', icon: BarChart3, label: 'Impact' },
  ],
  ngo: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/browse', icon: Package, label: 'Browse Donations' },
    { to: '/claims', icon: Package, label: 'My Claims' },
    { to: '/qr-scan', icon: QrCode, label: 'Verify Dropoff QR' },
    { to: '/notifications', icon: Bell, label: 'Notifications', hasBadge: true },
    { to: '/analytics', icon: BarChart3, label: 'Impact' },
  ],
  volunteer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/deliveries', icon: Truck, label: 'My Deliveries' },
    { to: '/qr-scan', icon: QrCode, label: 'Scan QR' },
    { to: '/notifications', icon: Bell, label: 'Notifications', hasBadge: true },
    { to: '/analytics', icon: BarChart3, label: 'Impact' },
  ],
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/verifications', icon: Shield, label: 'Verifications' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/complaints', icon: Shield, label: 'Complaints' },
    { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ],
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await api.get('/notifications', {
          params: { unread: 'true', limit: 1 },
        });
        const total = res.data?.data?.pagination?.total ?? (res.data?.data?.notifications || []).length;
        setUnreadCount(total);
      } catch {
        // ignore
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname, setMobileOpen]);

  const navItems = roleNavItems[user?.role] || [];

  const handleLogout = async () => {
    if (setMobileOpen) setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const roleLabel = {
    provider: 'Food Provider',
    ngo: 'NGO / Shelter',
    volunteer: 'Volunteer',
    admin: 'Administrator',
  };

  return (
    <>
      {/* Mobile Top Navigation Bar (Visible only on screens < lg) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-[#232328] z-30 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen?.(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl bg-[#18181b] border border-[#232328] text-white hover:bg-[#232328] active:scale-95 transition-all"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold shadow-sm">
              <Box className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight leading-none block">FoodRescue</span>
              <span className="text-[10px] text-neutral-400 font-medium leading-none block mt-0.5">
                {roleLabel[user?.role] || 'Member'}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl bg-[#18181b] border border-[#232328] text-neutral-300 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold bg-white text-black rounded-full shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-[#18181b] border border-[#232328] text-neutral-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen?.(false)}
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* Sidebar: Drawer on mobile (< lg), Fixed sidebar on desktop (>= lg) */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-[#0c0c0e] border-r border-[#232328] flex flex-col transition-all duration-300 z-50
          ${mobileOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20 w-72' : 'w-72 lg:w-64'}
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#232328]">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0 font-bold shadow-md shadow-white/5">
            <Box className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="animate-fade-in min-w-0 flex-1">
              <h1 className="font-bold text-base text-white tracking-tight truncate">FoodRescue</h1>
              <p className="text-[11px] text-neutral-400 font-medium truncate">{roleLabel[user?.role] || 'Member'}</p>
            </div>
          )}
          
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-[#1f1f24] text-neutral-400 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen?.(false)}
            className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-[#1f1f24] text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.to === '/donations'
                ? location.pathname === '/donations' || (location.pathname.startsWith('/donations/') && location.pathname !== '/donations/new')
                : item.to === '/dashboard'
                ? location.pathname === '/dashboard' || location.pathname === '/'
                : location.pathname === item.to || (location.pathname.startsWith(item.to + '/') && item.to !== '/');

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen?.(false)}
                className={`sidebar-link relative ${isActive ? 'active' : ''} ${collapsed && !mobileOpen ? 'lg:justify-center lg:px-3' : ''}`}
                title={collapsed && !mobileOpen ? `${item.label} ${item.hasBadge && unreadCount > 0 ? `(${unreadCount})` : ''}` : undefined}
              >
                <div className="relative flex items-center">
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.hasBadge && unreadCount > 0 && collapsed && !mobileOpen && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full ring-2 ring-[#0c0c0e]" />
                  )}
                </div>
                {(!collapsed || mobileOpen) && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="animate-fade-in text-sm font-medium">{item.label}</span>
                    {item.hasBadge && unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-white text-black rounded-full shadow-sm animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout footer */}
        <div className="border-t border-[#232328] px-3 py-4 bg-[#0a0a0c]">
          {(!collapsed || mobileOpen) && (
            <div className="px-3 mb-3 animate-fade-in">
              <p className="font-semibold text-xs text-white truncate">{user?.full_name}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`sidebar-link w-full text-neutral-400 hover:text-white hover:bg-[#1c1c20] ${
              collapsed && !mobileOpen ? 'lg:justify-center lg:px-3' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 text-neutral-400" />
            {(!collapsed || mobileOpen) && <span className="text-xs font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
