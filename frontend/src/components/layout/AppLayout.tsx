import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-['Inter']">
      <Sidebar />
      {/* lg: offset for fixed sidebar; mobile: no offset (sidebar is overlay) */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Outlet />
      </div>
    </div>
  );
}
