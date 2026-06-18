import { CircleCheck, CircleX, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Submission {
  problem_title?: string;
  title?: string;
  verdict?: string;
  language?: string;
  created_at?: string;
}

export function RecentSubmissions({ submissions = [] }: { submissions?: Submission[] }) {
  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-card">
        <h3 className="text-foreground text-lg font-semibold tracking-tight">Recent Submissions</h3>
        <Link to="/app/problems" className="text-sm text-brand hover:text-[#3B82F6] font-semibold transition-colors">View All</Link>
      </div>

      {submissions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-10">
          <div>
            <CircleCheck className="w-10 h-10 text-border mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No submissions yet.</p>
            <p className="text-muted-foreground text-xs mt-1">Start solving problems to see your history.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="py-4 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-widest w-12 text-center">Status</th>
                <th className="py-4 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Problem</th>
                <th className="py-4 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-widest w-40">Verdict</th>
                <th className="py-4 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-widest w-32">Language</th>
                <th className="py-4 px-6 text-[12px] font-bold text-muted-foreground uppercase tracking-widest w-40 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((sub, idx) => {
                const isAccepted = sub.verdict === 'Accepted' || sub.verdict === 'AC';
                const timeAgo = sub.created_at
                  ? new Date(sub.created_at).toLocaleDateString()
                  : '—';
                return (
                  <tr key={idx} className="hover:bg-secondary transition-colors bg-card group cursor-pointer">
                    <td className="py-5 px-6 text-center">
                      {isAccepted
                        ? <CircleCheck className="w-5 h-5 text-success inline-block" />
                        : <CircleX className="w-5 h-5 text-destructive inline-block" />
                      }
                    </td>
                    <td className="py-5 px-6">
                      <span className="text-foreground font-semibold text-[15px] group-hover:text-brand transition-colors">
                        {sub.problem_title || sub.title || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <span className={`text-sm font-bold ${isAccepted ? 'text-success' : 'text-destructive'}`}>
                        {sub.verdict || '—'}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-muted-foreground font-mono text-[12px] font-medium">
                      {sub.language || '—'}
                    </td>
                    <td className="py-5 px-6 text-muted-foreground text-[12px] text-right font-mono font-medium">
                      <span className="flex items-center justify-end gap-2">
                        <Clock className="w-4 h-4" />
                        {timeAgo}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
