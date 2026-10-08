import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Package, Users, Truck, QrCode, Bell,
  BarChart3, Shield, LogOut, Leaf, ChevronLeft, Menu
} from 'lucide-react';
import { useState } from 'react';

const roleNavItems = {
  provider: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/donations', icon: Package, label: 'My Donations' },
    { to: '/donations/new', icon: Package, label: 'Post Donation' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/analytics', icon: BarChart3, label: 'Impact' },
  ],
  ngo: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/browse', icon: Package, label: 'Browse Donations' },
    { to: '/claims', icon: Package, label: 'My Claims' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/analytics', icon: BarChart3, label: 'Impact' },
  ],
  volunteer: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/deliveries', icon: Truck, label: 'My Deliveries' },
    { to: '/qr-scan', icon: QrCode, label: 'Scan QR' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
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
  const [collapsed, setCollapsed] = useState(false);

  const navItems = roleNavItems[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = {
    provider: 'Food Provider',
    ngo: 'NGO',
    volunteer: 'Volunteer',
    admin: 'Administrator',
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-surface-200 flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-100">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="font-bold text-lg text-surface-900">FoodRescue</h1>
            <p className="text-xs text-surface-400">{roleLabel[user?.role]}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-3' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-surface-100 px-3 py-4">
        {!collapsed && (
          <div className="px-3 mb-3 animate-fade-in">
            <p className="font-semibold text-sm text-surface-800 truncate">{user?.full_name}</p>
            <p className="text-xs text-surface-400 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${
            collapsed ? 'justify-center px-3' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
