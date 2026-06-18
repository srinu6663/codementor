import { useState, useEffect } from 'react';
import { Home, Code, Trophy, BookOpen, TrendingUp, BarChart3, Bot, LogOut, Menu, X, History, Users2, Brain, Medal } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { icon: Home,       label: 'Dashboard',      path: '/app/dashboard'  },
  { icon: Code,       label: 'Problems',       path: '/app/problems'   },
  { icon: Trophy,     label: 'Contests',       path: '/app/contests'   },
  { icon: BookOpen,   label: 'Assignments',    path: '/app/assignments' },
  { icon: Brain,      label: 'Aptitude Tests', path: '/app/aptitude' },
  { icon: Users2,     label: 'My Classes',     path: '/app/classes' },
  { icon: Medal,      label: 'Coding Profiles', path: '/app/coding-profiles' },
  { icon: TrendingUp, label: 'Placement Track', path: '/app/placement' },
  { icon: BarChart3,  label: 'Leaderboard',    path: '/app/leaderboard' },
  { icon: History,    label: 'My Submissions', path: '/app/submissions' },
  { icon: Bot,        label: 'AI Tutor',       path: '/app/ai-tutor'   },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="h-20 px-8 flex items-center justify-between border-b border-border flex-shrink-0">
        <Link to="/app/dashboard" className="flex items-center gap-4" onClick={onClose}>
          <div className="w-9 h-9 bg-brand flex items-center justify-center flex-shrink-0">
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className="text-foreground font-bold text-xl tracking-tight">CodeMentor</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(item => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/app/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={`w-full flex items-center gap-4 px-4 py-2.5 text-[15px] font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground border border-border'
                    : 'text-muted-foreground border border-transparent hover:bg-card hover:text-foreground'
                }`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-brand' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout (profile/account lives in the top-right header menu) */}
      <div className="p-4 border-t border-border bg-background flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-muted-foreground hover:text-foreground hover:bg-card hover:border-muted-foreground text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <div className="hidden lg:block fixed left-0 top-0 z-50">
        <SidebarContent />
      </div>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border text-foreground hover:bg-secondary transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />
          {/* Drawer */}
          <div className="relative z-10" onClick={e => e.stopPropagation()}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
