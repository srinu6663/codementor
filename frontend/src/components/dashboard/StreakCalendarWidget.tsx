import { Hexagon, Check } from 'lucide-react';

export function StreakCalendarWidget({ heatmap = [] }: { heatmap?: { date: string; count: number }[] }) {
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'short' });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay(); // 0 = Sunday
  
  const generateCalendar = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const calendarDays = generateCalendar();
  const activeDays = heatmap
    .filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && h.count > 0;
    })
    .map(h => new Date(h.date).getDate());

  return (
    <div className="bg-card border border-border rounded-md p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[15px] text-foreground font-bold">Day {today.getDate()} <span className="text-muted-foreground text-xs ml-2 font-medium">20:06:37 left</span></div>
        </div>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <Hexagon className="w-12 h-12 text-brand absolute stroke-1" fill="var(--brand)" fillOpacity={0.1} />
          <span className="text-brand text-xs font-bold z-10 text-center leading-none mt-0.5">{today.getDate()}<br/><span className="text-[9px] uppercase font-semibold">{currentMonth}</span></span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-3 text-muted-foreground font-semibold tracking-wide">
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>
      
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-sm font-mono flex-1 content-start">
        {calendarDays.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const isActive = activeDays.includes(day);
          const isToday = day === today.getDate();
          return (
            <div key={idx} className="flex justify-center">
              <div className={`w-7 h-7 flex items-center justify-center rounded-sm text-xs font-semibold ${
                isToday ? 'bg-brand text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' :
                isActive ? 'bg-brand/10 text-brand border border-brand/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              } cursor-default transition-all`}>
                {day}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-5 border-t border-border">
        <div className="flex items-center justify-between text-[13px] text-brand font-bold mb-3 cursor-pointer hover:text-[#3B82F6] transition-colors">
          <span>Weekly Premium</span>
          <span>5 days left</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map(w => (
            <div key={w} className={`flex-1 h-7 rounded-sm flex items-center justify-center text-[11px] font-mono font-bold ${w === 2 ? 'bg-brand text-white' : 'bg-background border border-border text-muted-foreground'}`}>
              W{w}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-success flex items-center justify-center text-background">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div> 
            0 Redeem
          </div>
          <span className="hover:text-foreground cursor-pointer transition-colors">Rules</span>
        </div>
      </div>
    </div>
  );
}
