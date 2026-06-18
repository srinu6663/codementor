import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Shield, Loader2, Check, X, Search, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Faculty {
  id: string;
  name: string;
  email: string;
  permissions: Record<string, boolean>;
}

// Human-readable labels for the permission keys.
const PERM_LABELS: Record<string, string> = {
  manage_problems:    'Manage Problems',
  manage_assignments: 'Manage Assignments',
  manage_students:    'View Students',
  export_data:        'Export Data',
  generate_ai_tests:  'AI Test Generator',
  run_plagiarism:     'Run Plagiarism',
  manage_contests:    'Manage Contests',
};

export default function FacultyPermissionsPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok: boolean) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/faculty/faculty-list');
      if (res.data?.success) {
        setFaculty(res.data.data);
        setAllPerms(res.data.allPermissions || Object.keys(PERM_LABELS));
      }
    } catch (e: any) {
      flash(e?.response?.data?.error || 'Failed to load faculty', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (facultyId: string, perm: string) => {
    setFaculty(prev => prev.map(f =>
      f.id === facultyId
        ? { ...f, permissions: { ...f.permissions, [perm]: !f.permissions[perm] } }
        : f
    ));
    setDirty(d => ({ ...d, [facultyId]: true }));
  };

  const save = async (f: Faculty) => {
    setSavingId(f.id);
    try {
      await api.patch(`/api/faculty/permissions/${f.id}`, { permissions: f.permissions });
      setDirty(d => { const n = { ...d }; delete n[f.id]; return n; });
      flash(`Saved permissions for ${f.name}`, true);
    } catch (e: any) {
      flash(e?.response?.data?.error || 'Save failed', false);
    } finally {
      setSavingId(null);
    }
  };

  const filtered = faculty.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold text-foreground">Faculty Permissions</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">Grant or revoke capabilities per faculty member. Changes take effect on their next login (token refresh).</p>

        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search faculty…"
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-link"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No faculty found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => (
              <div key={f.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-foreground font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{f.email}</div>
                  </div>
                  <button
                    onClick={() => save(f)}
                    disabled={!dirty[f.id] || savingId === f.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#238636] text-white text-xs rounded-lg hover:bg-[#2EA043] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {dirty[f.id] ? 'Save' : 'Saved'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allPerms.map(p => {
                    const on = !!f.permissions[p];
                    return (
                      <button
                        key={p}
                        onClick={() => toggle(f.id, p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          on
                            ? 'bg-brand/15 border-brand/40 text-link'
                            : 'bg-background border-border text-muted-foreground hover:border-muted-foreground'
                        }`}
                      >
                        {on ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {PERM_LABELS[p] || p}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 border text-sm font-medium shadow-lg rounded-lg ${
          toast.ok ? 'bg-card border-success/50 text-success' : 'bg-card border-destructive/50 text-destructive'
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
