import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Users2, Plus, Copy, Check, Loader2, X, GraduationCap } from 'lucide-react';

interface Classroom {
  id: string; name: string; department: string | null; section: string | null;
  join_code: string; member_count: number;
}
interface Member {
  id: string; name: string; email: string; roll_no: string | null;
  department: string | null; section: string | null;
}

function MembersModal({ classroom, onClose }: { classroom: Classroom; onClose: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/api/classrooms/${classroom.id}/members`)
      .then(r => { if (r.data?.success) setMembers(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classroom.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h3 className="text-foreground font-semibold">{classroom.name} — Members</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No students have joined yet.</p>
          ) : (
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 px-3 bg-background rounded-lg border border-border">
                  <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.roll_no ? `${m.roll_no} · ` : ''}{m.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FacultyClassesPage() {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Classroom | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/api/classrooms')
      .then(r => { if (r.data?.success) setClasses(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post('/api/classrooms', { name: name.trim(), department: department.trim() || undefined, section: section.trim() || undefined });
      setName(''); setDepartment(''); setSection('');
      load();
    } catch {} finally { setCreating(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {viewing && <MembersModal classroom={viewing} onClose={() => setViewing(null)} />}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Users2 className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold text-foreground">Classes</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Create a class and share its join code — students enroll by entering it.</p>

        {/* Create */}
        <form onSubmit={create} className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-muted-foreground mb-1">Class name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CSE-A DSA 2025"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand" />
          </div>
          <div className="w-28">
            <label className="block text-xs text-muted-foreground mb-1">Department</label>
            <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="CSE"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand" />
          </div>
          <div className="w-20">
            <label className="block text-xs text-muted-foreground mb-1">Section</label>
            <input value={section} onChange={e => setSection(e.target.value)} placeholder="A"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand" />
          </div>
          <button type="submit" disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No classes yet. Create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-foreground font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[c.department, c.section && `Sec ${c.section}`].filter(Boolean).join(' · ') || 'No dept/section'}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users2 className="w-3.5 h-3.5" />{c.member_count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                    <span className="text-xs text-muted-foreground">Join code</span>
                    <span className="font-mono font-bold tracking-widest text-brand">{c.join_code}</span>
                  </div>
                  <button onClick={() => copyCode(c.join_code)} title="Copy code"
                    className="p-2.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
                    {copied === c.join_code ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={() => setViewing(c)}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors">
                  View members
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
