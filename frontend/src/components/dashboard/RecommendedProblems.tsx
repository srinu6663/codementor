import { Bot } from "lucide-react";
import { Link } from "react-router-dom";

interface Problem {
  _id?: string | number;
  id?: string | number;
  title: string;
  difficulty: string;
  tags?: string[];
  acceptance_rate?: number;
}

const difficultyColor = (d: string) => {
  switch ((d || '').toLowerCase()) {
    case 'easy':   return 'text-success';
    case 'medium': return 'text-warning';
    case 'hard':   return 'text-destructive';
    default:       return 'text-muted-foreground';
  }
};

export function RecommendedProblems({ problems = [], level }: { problems?: Problem[]; level?: string }) {
  if (problems.length === 0) {
    return (
      <div className="bg-card border border-border flex flex-col h-full">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h3 className="text-foreground text-lg font-semibold tracking-tight">Recommended for You</h3>
          <span className="text-xs text-purple flex items-center gap-1.5 bg-background px-3 py-1.5 border border-purple/30">
            <Bot className="w-3.5 h-3.5" />
            <span>AI-curated</span>
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-center py-10">
          <div>
            <Bot className="w-10 h-10 text-border mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Solve more problems to get recommendations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <h3 className="text-foreground text-lg font-semibold tracking-tight">Recommended for You</h3>
        <div className="flex items-center gap-2">
          {level && (
            <span className="text-xs text-muted-foreground bg-background px-2.5 py-1.5 border border-border capitalize">
              Tuned: <span className="text-foreground font-medium">{level}</span>
            </span>
          )}
          <span className="text-xs text-purple flex items-center gap-1.5 bg-background px-3 py-1.5 border border-purple/30">
            <Bot className="w-3.5 h-3.5" />
            <span>AI-curated</span>
          </span>
        </div>
      </div>
      <div className="divide-y divide-border flex-1">
        {problems.map((problem) => {
          const pid = problem._id || problem.id;
          return (
            <Link
              key={pid}
              to={`/app/problems/${pid}`}
              className="p-6 flex items-center justify-between hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <span className="text-foreground text-[15px] font-semibold truncate group-hover:text-brand transition-colors">
                  {problem.title}
                </span>
              </div>
              <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                {problem.tags?.[0] && (
                  <span className="text-xs bg-background border border-border text-muted-foreground px-3 py-1.5 font-medium hidden sm:inline">
                    {problem.tags[0]}
                  </span>
                )}
                <span className={`text-sm w-16 text-right font-bold ${difficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                {problem.acceptance_rate && (
                  <span className="text-sm text-muted-foreground w-14 text-right font-mono font-medium hidden md:inline">
                    {problem.acceptance_rate.toFixed(1)}%
                  </span>
                )}
                <span className="px-5 py-2 bg-brand text-white text-sm font-semibold group-hover:bg-brand-hover transition-colors">
                  Solve
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
