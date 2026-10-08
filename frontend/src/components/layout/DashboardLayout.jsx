import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationPopup from '../common/NotificationPopup';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 sm:p-8 transition-all duration-300 min-w-0">
        <Outlet />
      </main>
      <NotificationPopup />
    </div>
  );
}
