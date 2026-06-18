import { Target, AlertCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface TopicData {
  topic: string;
  mastery: number;
}

interface Props {
  data?: TopicData[];
}

const defaultData: TopicData[] = [
  { topic: 'Arrays', mastery: 0 },
  { topic: 'Strings', mastery: 0 },
  { topic: 'Trees', mastery: 0 },
  { topic: 'DP', mastery: 0 },
  { topic: 'Graphs', mastery: 0 },
  { topic: 'Greedy', mastery: 0 },
];

export function TopicStrengthRadar({ data = defaultData }: Props) {
  const chartData = data.map((d) => ({ topic: d.topic, score: d.mastery, fullMark: 100 }));
  const focusAreas = chartData.filter((d) => d.score < 50);

  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-foreground text-lg font-semibold tracking-tight">Topic Strength</h3>
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div className="flex-1 w-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickCount={5} axisLine={false} />
              <Radar name="Strength" dataKey="score" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {focusAreas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Focus Areas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusAreas.map((item, idx) => (
                <div key={idx} className="px-2.5 py-1 bg-background border border-border text-destructive text-xs font-medium cursor-default hover:border-destructive/50 transition-colors">
                  {item.topic}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
