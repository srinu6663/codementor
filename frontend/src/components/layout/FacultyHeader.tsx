import { Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { ThemeToggle } from '../ThemeToggle';

export function FacultyHeader() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'FA';

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-background border-b border-border flex items-center px-6 gap-4 sticky top-0 z-10 flex-shrink-0">
      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span className="text-[10px] px-2.5 py-1 bg-purple/10 border border-purple/30 text-purple font-bold uppercase tracking-widest">
          Faculty
        </span>

        <div className="h-6 w-px bg-border" />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications placeholder */}
        <button aria-label="Notifications" className="p-2 text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 bg-background hover:bg-card p-1.5 pr-2.5 transition-colors border border-transparent hover:border-border outline-none focus:border-border">
              <div className="w-8 h-8 bg-purple flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-foreground leading-none">{user?.name || 'Faculty'}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate max-w-[120px]">{user?.email || ''}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mt-1 bg-card border-border">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-foreground">{user?.name || 'Faculty'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:bg-secondary focus:text-foreground">
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:bg-secondary focus:text-foreground">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
