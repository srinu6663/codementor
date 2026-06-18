import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Users2, Loader2, LogIn, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';
import { DashboardHeader } from '../components/layout/DashboardHeader';

interface JoinedClass {
  id: string; name: string; department: string | null; section: string | null;
  faculty_name: string; joined_at: string;
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<JoinedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/classrooms')
      .then(r => { if (r.data?.success) setClasses(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true); setMsg(null);
    try {
      const r = await api.post('/api/classrooms/join', { code: code.trim() });
      if (r.data?.success) {
        setMsg({ text: `Joined "${r.data.data.name}"`, ok: true });
        setCode('');
        load();
      }
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || 'Could not join class', ok: false });
    } finally { setJoining(false); }
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Users2 className="w-6 h-6 text-brand" />
            <h1 className="text-2xl font-bold text-foreground">My Classes</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-6">Enter the join code shared by your faculty to enroll in a class.</p>

          {/* Join box */}
          <form onSubmit={join} className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-muted-foreground mb-1">Join code</label>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setMsg(null); }}
                placeholder="e.g. 7KQ9PX"
                maxLength={12}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono tracking-widest uppercase focus:outline-none focus:border-brand"
              />
            </div>
            <button type="submit" disabled={joining || !code.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Join
            </button>
            {msg && (
              <div className={`w-full flex items-center gap-2 text-sm ${msg.ok ? 'text-success' : 'text-destructive'}`}>
                {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}
              </div>
            )}
          </form>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>You haven't joined any classes yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="text-foreground font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[c.department, c.section && `Sec ${c.section}`].filter(Boolean).join(' · ')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">Faculty: <span className="text-foreground">{c.faculty_name}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
