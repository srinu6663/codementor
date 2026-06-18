import { useState, useEffect } from 'react';
import api from '../lib/api';
import { ScrollText, Loader2, Search } from 'lucide-react';

interface LogRow {
  id: string;
  action: string;
  detail: string | null;
  ip: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

// Colour-code action families so the trail is scannable.
const actionColor = (a: string) => {
  if (a.startsWith('permissions')) return 'var(--purple)';
  if (a.startsWith('plagiarism')) return 'var(--warning)';
  if (a.startsWith('marks')) return 'var(--brand)';
  if (a.includes('delete')) return 'var(--destructive)';
  return 'var(--muted-foreground)';
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/api/faculty/audit-logs?limit=300')
      .then(r => { if (r.data?.success) setRows(r.data.data); })
      .catch(e => setError(e?.response?.data?.error || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    if (!q) return true;
    const hay = `${r.action} ${r.detail ?? ''} ${r.user_name ?? ''} ${r.user_email ?? ''} ${r.ip ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <ScrollText className="w-6 h-6 text-brand" />
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Trail of sensitive actions — permission changes, plagiarism runs, grade exports, deletions.
        </p>

        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Filter by action, user, IP…"
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-link"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{rows.length === 0 ? 'No audited actions yet.' : 'No matching entries.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-card border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="text-left py-3 px-4">When</th>
                  <th className="text-left py-3 px-4">Action</th>
                  <th className="text-left py-3 px-4">User</th>
                  <th className="text-left py-3 px-4">Detail</th>
                  <th className="text-left py-3 px-4">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-secondary hover:bg-background/50">
                    <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono font-medium" style={{ color: actionColor(r.action) }}>{r.action}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="text-foreground text-xs">{r.user_name || '—'}</div>
                      <div className="text-muted-foreground text-[11px]">{r.user_email || ''}</div>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground max-w-[280px] truncate" title={r.detail || ''}>{r.detail || '—'}</td>
                    <td className="py-2.5 px-4 text-[11px] font-mono text-muted-foreground">{r.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
