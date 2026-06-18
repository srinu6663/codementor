import { Calendar } from "lucide-react";

interface HeatmapProps {
  data?: { date: string; count: number }[];
  totalSubmissions?: number;
  maxStreak?: number;
}

export function ContributionHeatmap({ data = [], totalSubmissions = 0, maxStreak = 0 }: HeatmapProps) {
  const monthsConfig = [
    { name: "Jan", weekCount: 5 }, { name: "Feb", weekCount: 4 }, { name: "Mar", weekCount: 4 },
    { name: "Apr", weekCount: 5 }, { name: "May", weekCount: 4 }, { name: "Jun", weekCount: 4 },
    { name: "Jul", weekCount: 5 }, { name: "Aug", weekCount: 4 }, { name: "Sep", weekCount: 4 },
    { name: "Oct", weekCount: 5 }, { name: "Nov", weekCount: 4 }, { name: "Dec", weekCount: 4 },
  ];

  const dataMap: Record<string, number> = {};
  data.forEach(d => { dataMap[d.date] = d.count; });

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 363);

  const getColor = (level: number) => {
    const colors = ["var(--background)", "#0E4429", "#006D32", "#26A641", "#39D353"];
    return colors[Math.min(level, 4)];
  };

  // Build monthly data from real submission data
  const monthlyData = monthsConfig.map((month, mIdx) => ({
    name: month.name,
    weeks: Array.from({ length: month.weekCount }, (_, wIdx) =>
      Array.from({ length: 7 }, (__, dIdx) => {
        // Approximate date mapping
        const dayOffset = (mIdx * 30) + (wIdx * 7) + dIdx;
        const cur = new Date(startDate);
        cur.setDate(startDate.getDate() + dayOffset);
        const key = cur.toISOString().split("T")[0];
        const count = dataMap[key] ?? 0;
        if (count === 0) return 0;
        if (count <= 1) return 1;
        if (count <= 3) return 2;
        if (count <= 5) return 3;
        return 4;
      })
    ),
  }));

  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-foreground text-lg font-semibold tracking-tight">Monthly Activity</h3>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-6">
          <div><span className="text-foreground font-bold font-mono text-base">{totalSubmissions}</span> Submissions</div>
          <div><span className="text-foreground font-bold font-mono text-base">{maxStreak}</span> Max Streak</div>
        </div>
      </div>
      <div className="p-8 flex-1 flex flex-col justify-between">
        <div className="overflow-x-auto pb-6">
          <div className="inline-flex gap-6">
            {monthlyData.map((month, mIdx) => (
              <div key={mIdx} className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1.5">{month.name}</span>
                <div className="flex gap-[3px]">
                  {month.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.map((day, dIdx) => (
                        <div
                          key={dIdx}
                          className="w-[13px] h-[13px] border border-border/40 hover:border-muted-foreground transition-colors cursor-crosshair"
                          style={{ backgroundColor: getColor(day) }}
                          title={`${day} contributions`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 mt-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>Less</span>
          <div className="flex gap-[4px]">
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className="w-[13px] h-[13px] border border-border/40" style={{ backgroundColor: getColor(level) }} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
