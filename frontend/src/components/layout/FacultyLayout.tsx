import { Outlet } from 'react-router-dom';
import { FacultySidebar } from './FacultySidebar';
import { FacultyHeader } from './FacultyHeader';

export function FacultyLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex font-['Inter']">
      <FacultySidebar />
      <div className="md:ml-56 flex-1 flex flex-col min-w-0">
        <FacultyHeader />
        <Outlet />
      </div>
    </div>
  );
}
