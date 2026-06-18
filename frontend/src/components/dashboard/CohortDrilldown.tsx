import { useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronRight, ChevronDown, Users } from 'lucide-react';
import api from '../../lib/api';
import { StudentDetailModal } from './StudentDetailModal';

interface Student {
  id: string; name: string; email: string;
  department?: string | null; section?: string | null; year?: number | null; rollNo?: string | null;
  problemsSolved: number; totalSubmissions: number; acRate: number;
}

interface SectionGroup { name: string; students: Student[]; avgSolved: number; avgAc: number; }
interface DeptGroup { name: string; count: number; avgSolved: number; avgAc: number; sections: SectionGroup[]; }

const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
const acColor = (v: number) => (v >= 60 ? 'text-success' : v >= 30 ? 'text-warning' : 'text-destructive');

export function CohortDrilldown() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDept, setOpenDept] = useState<Record<string, boolean>>({});
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Student | null>(null);

  useEffect(() => {
    api.get('/api/faculty/students')
      .then(r => { if (r.data?.success) setStudents(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tree = useMemo<DeptGroup[]>(() => {
    const byDept: Record<string, Student[]> = {};
    for (const s of students) {
      const d = s.department || 'Unassigned';
      (byDept[d] ||= []).push(s);
    }
    return Object.entries(byDept)
      .map(([name, list]) => {
        const bySec: Record<string, Student[]> = {};
        for (const s of list) {
          const sec = s.section || 'Unassigned';
          (bySec[sec] ||= []).push(s);
        }
        const sections = Object.entries(bySec)
          .map(([secName, secList]) => ({
            name: secName,
            students: secList.sort((a, b) => b.problemsSolved - a.problemsSolved),
            avgSolved: avg(secList.map(s => s.problemsSolved)),
            avgAc: avg(secList.map(s => s.acRate)),
          }))
          .sort((a, b) => b.avgSolved - a.avgSolved);
        return {
          name, count: list.length, sections,
          avgSolved: avg(list.map(s => s.problemsSolved)),
          avgAc: avg(list.map(s => s.acRate)),
        };
      })
      .sort((a, b) => b.avgSolved - a.avgSolved);
  }, [students]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>;
  if (!students.length) return <p className="text-sm text-muted-foreground py-12 text-center">No students enrolled yet.</p>;

  return (
    <div className="space-y-2">
      {selected && <StudentDetailModal student={selected} onClose={() => setSelected(null)} />}
      {tree.map(dept => {
        const dOpen = openDept[dept.name];
        return (
          <div key={dept.name} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenDept(o => ({ ...o, [dept.name]: !o[dept.name] }))}
              className="w-full flex items-center gap-2 px-4 py-3 bg-background hover:bg-accent transition-colors text-left"
            >
              {dOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm font-semibold text-foreground flex-1">{dept.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{dept.count}</span>
              <span className="text-xs text-muted-foreground">avg <span className="font-mono text-foreground">{dept.avgSolved}</span> solved</span>
              <span className={`text-xs font-mono font-medium ${acColor(dept.avgAc)}`}>{dept.avgAc}% AC</span>
            </button>

            {dOpen && dept.sections.map(sec => {
              const key = `${dept.name}|${sec.name}`;
              const sOpen = openSec[key];
              return (
                <div key={key} className="border-t border-border">
                  <button
                    onClick={() => setOpenSec(o => ({ ...o, [key]: !o[key] }))}
                    className="w-full flex items-center gap-2 px-4 py-2.5 pl-9 bg-card hover:bg-accent transition-colors text-left"
                  >
                    {sOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-sm text-foreground flex-1">Section {sec.name}</span>
                    <span className="text-xs text-muted-foreground">{sec.students.length} students</span>
                    <span className="text-xs text-muted-foreground">avg <span className="font-mono text-foreground">{sec.avgSolved}</span></span>
                    <span className={`text-xs font-mono font-medium ${acColor(sec.avgAc)}`}>{sec.avgAc}%</span>
                  </button>

                  {sOpen && (
                    <div className="bg-background divide-y divide-secondary">
                      {sec.students.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s)}
                          className="w-full flex items-center gap-3 px-4 py-2 pl-14 hover:bg-accent transition-colors text-left"
                        >
                          <span className="text-sm text-foreground flex-1 truncate">
                            {s.name}
                            <span className="text-xs text-muted-foreground ml-2">{s.rollNo || s.email}</span>
                          </span>
                          <span className="text-xs font-mono text-success">{s.problemsSolved} solved</span>
                          <span className={`text-xs font-mono font-medium ${acColor(s.acRate)}`}>{s.acRate}%</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
