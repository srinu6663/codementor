import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Calendar, Users, BookOpen } from 'lucide-react';

export function UpcomingContests() {
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await api.get('/api/student/assignments');
        if (res.data.success) {
          setAssignments(res.data.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to fetch assignments', err);
      }
    };
    fetchAssignments();
  }, []);
  return (
    <div className="bg-card border border-border flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <h3 className="text-foreground text-lg font-semibold tracking-tight flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-warning" />
          Upcoming Assignments
        </h3>
        <button onClick={() => window.location.href='/app/assignments'} className="text-sm text-brand hover:text-[#3B82F6] font-semibold transition-colors">View All</button>
      </div>
      <div className="p-6 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        {assignments.length > 0 ? assignments.map((ass, idx) => (
          <div key={idx} className="p-5 bg-background border border-border hover:border-muted-foreground transition-colors flex flex-col group">
            <h4 className="text-foreground font-semibold text-sm mb-3 group-hover:text-brand transition-colors">{ass.title}</h4>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground mb-4 flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-mono">Due: {new Date(ass.deadline).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="font-mono">{ass.problems?.length || 0} problems</span>
              </div>
            </div>
            <button 
              onClick={() => window.location.href='/app/assignments'}
              className="w-full py-2 bg-card border border-border text-foreground text-xs font-medium hover:bg-brand hover:border-brand hover:text-white transition-colors"
            >
              Start Now
            </button>
          </div>
        )) : (
          <div className="col-span-3 text-center text-muted-foreground py-4 text-sm">
            No upcoming assignments.
          </div>
        )}
      </div>
    </div>
  );
}
