import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Users, Truck, QrCode, Bell,
  BarChart3, Shield, LogOut, ChevronLeft, Menu, Box
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

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/notifications', {
          params: { unread: 'true', limit: 100 },
        });
        const total = res.data?.data?.pagination?.total || (res.data?.data?.notifications || []).length;
        setUnreadCount(total);
      } catch {
        // ignore
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = roleNavItems[user?.role] || [];

  const handleLogout = async () => {
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
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0c0c0e] border-r border-[#232328] flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[#232328]">
        <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center flex-shrink-0 font-bold shadow-md shadow-white/5">
          <Box className="w-5 h-5 text-black stroke-[2.5]" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-base text-white tracking-tight">FoodRescue</h1>
            <p className="text-[11px] text-neutral-400 font-medium">{roleLabel[user?.role] || 'Member'}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-[#1f1f24] text-neutral-400 hover:text-white transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
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
              className={`sidebar-link relative ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-3' : ''}`}
              title={collapsed ? `${item.label} ${item.hasBadge && unreadCount > 0 ? `(${unreadCount})` : ''}` : undefined}
            >
              <div className="relative flex items-center">
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.hasBadge && unreadCount > 0 && collapsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full ring-2 ring-[#0c0c0e]" />
                )}
              </div>
              {!collapsed && (
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

      {/* User section */}
      <div className="border-t border-[#232328] px-3 py-4">
        {!collapsed && (
          <div className="px-3 mb-3 animate-fade-in">
            <p className="font-semibold text-xs text-white truncate">{user?.full_name}</p>
            <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-neutral-400 hover:text-white hover:bg-[#1c1c20] ${
            collapsed ? 'justify-center px-3' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
