import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationPopup from '../common/NotificationPopup';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#050505] text-neutral-900 dark:text-white flex flex-col lg:flex-row overflow-x-hidden transition-colors duration-200">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main
        className={`flex-1 transition-all duration-300 min-w-0 w-full p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
      <NotificationPopup />
    </div>
  );
}
