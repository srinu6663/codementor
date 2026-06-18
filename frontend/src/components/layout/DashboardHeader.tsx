import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Search, Bell, Flame, ChevronDown, User, Settings, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { ThemeToggle } from '../ThemeToggle';

interface Notification {
  id: string;
  type: string;
  message: string;
  deadline?: string;
}

export function DashboardHeader() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'ST';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [streak, setStreak] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    api.get('/api/student/dashboard')
      .then(r => setStreak(r.data?.data?.stats?.streak ?? 0))
      .catch(() => {});

    api.get('/api/student/notifications')
      .then(r => setNotifications(r.data?.data ?? []))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const unreadCount = notifications.length;

  return (
    <header className="h-20 bg-background border-b border-border flex items-center px-10 gap-6 sticky top-0 z-10">
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="Search problems, topics..."
            className="w-full pl-12 pr-4 py-3 bg-card border border-border text-foreground text-[15px] placeholder-muted-foreground outline-none focus:border-brand transition-all"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) navigate(`/app/problems?search=${encodeURIComponent(val)}`);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-auto">
        {/* Streak */}
        <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-sm cursor-default hover:border-muted-foreground transition-colors">
          <Flame className={`w-4 h-4 ${streak > 0 ? 'text-warning' : 'text-border'}`} />
          <span className="text-foreground font-medium font-mono text-[15px]">{streak}</span>
          <span className="text-muted-foreground text-[13px] uppercase tracking-wider font-semibold">Day Streak</span>
        </div>

        <div className="h-8 w-px bg-border" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button aria-label="Notifications" className="relative p-2.5 bg-background hover:bg-card transition-colors border border-transparent hover:border-border">
              <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive border-[2px] border-background" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
              {unreadCount > 0 && (
                <span
                  className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => setNotifications([])}
                >
                  Clear all
                </span>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No new notifications
                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className="px-4 py-3 flex gap-3 border-b border-border last:border-0 hover:bg-background transition-colors cursor-default">
                    {notif.type === 'deadline'
                      ? <AlertTriangle className="w-4 h-4 mt-0.5 text-warning flex-shrink-0" />
                      : <Clock className="w-4 h-4 mt-0.5 text-brand flex-shrink-0" />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{notif.message}</p>
                      {notif.deadline && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Due {new Date(notif.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 bg-background hover:bg-card p-1.5 pr-2.5 transition-colors border border-transparent hover:border-border outline-none focus:border-border">
              <div className="w-8 h-8 bg-brand flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 bg-card border-border">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{user?.name || 'Student'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="cursor-pointer text-muted-foreground hover:text-foreground focus:bg-secondary focus:text-foreground"
              onClick={() => navigate('/app/profile')}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-muted-foreground hover:text-foreground focus:bg-secondary focus:text-foreground">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
