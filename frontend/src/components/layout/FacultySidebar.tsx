import { BarChart3, FileText, LogOut, Code, BookOpen, Users2, Activity, Shield, GraduationCap, ScrollText, Brain } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const baseNavItems = [
  { icon: BarChart3,  label: 'Dashboard', path: '/faculty/dashboard' },
  { icon: FileText,   label: 'Problems',  path: '/faculty/problems'  },
  { icon: BookOpen,   label: 'Assignments', path: '/faculty/assignments' },
  { icon: Brain,      label: 'MCQ / Aptitude', path: '/faculty/mcq' },
  { icon: GraduationCap, label: 'Classes', path: '/faculty/classes' },
  { icon: Users2,     label: 'Students',  path: '/faculty/students'  },
  { icon: Shield,     label: 'Plagiarism', path: '/faculty/plagiarism' },
  { icon: Activity,   label: 'Judge Health', path: '/faculty/judge-health' },
];

export function FacultySidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const navItems = user?.role === 'admin'
    ? [...baseNavItems,
       { icon: Shield, label: 'Permissions', path: '/faculty/permissions' },
       { icon: ScrollText, label: 'Audit Log', path: '/faculty/audit-logs' }]
    : baseNavItems;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="w-56 h-screen bg-background border-r border-border hidden md:flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-border">
        <Link to="/faculty/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple flex items-center justify-center flex-shrink-0">
            <Code className="w-4 h-4 text-white" />
          </div>
          <span className="text-foreground font-bold text-lg tracking-tight">CodeMentor</span>
        </Link>
      </div>

      {/* Faculty badge */}
      <div className="px-5 py-3 border-b border-border">
        <span className="text-[10px] px-2 py-0.5 bg-purple/10 border border-purple/30 text-purple font-bold uppercase tracking-widest">
          Faculty Portal
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground border border-border'
                    : 'text-muted-foreground border border-transparent hover:bg-card hover:text-foreground'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-purple' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout (profile/account lives in the top-right header menu) */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border text-muted-foreground hover:text-foreground hover:bg-card hover:border-muted-foreground text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
