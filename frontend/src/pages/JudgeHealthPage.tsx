import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import {
  RefreshCw, Loader2, Server, Cpu, Layers, Tag,
  CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';

interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  depth: number;
}

interface HealthData {
  online: boolean;
  version: string;
  workers: unknown;
  queue: QueueStats | null;
  system_info: Record<string, unknown> | null;
  error?: string;
  checked_at: string;
}

const REFRESH_MS = 10000;

// Count active Judge0 workers from the /workers payload, which is normally an
// array of per-queue objects like [{ queue, size, available, idle, working }].
function workerCount(workers: unknown): number | null {
  if (!Array.isArray(workers)) return null;
  let total = 0;
  let found = false;
  for (const w of workers) {
    if (w && typeof w === 'object') {
      const size = (w as Record<string, unknown>).size;
      const available = (w as Record<string, unknown>).available;
      const val =
        typeof size === 'number' ? size :
        typeof available === 'number' ? available : null;
      if (val !== null) { total += val; found = true; }
    }
  }
  return found ? total : workers.length;
}

function StatCard({
  icon: Icon, label, value, accent = 'var(--link)', sub,
}: {
  icon: typeof Server;
  label: string;
  value: React.ReactNode;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="w-4 h-4" style={{ color: accent }} />
        <span>{label}</span>
      </div>
      <div className="text-foreground text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-muted-foreground text-xs mt-1">{sub}</div>}
    </div>
  );
}

export default function JudgeHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const load = useCallback(async () => {
    if (initialLoad.current) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/api/judge-health');
      if (res.data?.success) {
        setData(res.data.data);
        setError(null);
      } else {
        setError(res.data?.error || 'Failed to load judge health');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load judge health');
    } finally {
      initialLoad.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const wc = data ? workerCount(data.workers) : null;
  const sysEntries = data?.system_info
    ? Object.entries(data.system_info)
    : [];

  return (
    <div className="flex-1 min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-foreground text-xl font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-link" />
              Judge Health
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Live status of the Judge0 execution backend.
              {data?.checked_at && (
                <span className="ml-1">
                  Last checked {new Date(data.checked_at).toLocaleTimeString()}.
                </span>
              )}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground text-sm font-medium rounded-lg hover:border-muted-foreground disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-link animate-spin" />
          </div>
        ) : (
          <>
            {/* Status pill */}
            <div className="mb-6">
              {data?.online ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border text-success bg-success/10 border-success/20">
                  <CheckCircle2 className="w-4 h-4" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border text-destructive bg-destructive/10 border-destructive/20">
                  <XCircle className="w-4 h-4" />
                  Offline
                </span>
              )}
            </div>

            {/* Error banner (request-level or backend-reported) */}
            {(error || data?.error) && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-6 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error || data?.error}</span>
              </div>
            )}

            {/* Stat grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={Tag}
                label="Version"
                value={data?.version ?? 'unknown'}
                accent="var(--link)"
              />
              <StatCard
                icon={Cpu}
                label="Workers"
                value={wc !== null ? wc : '—'}
                accent="var(--success)"
                sub={wc === null ? 'Not reported' : 'Active execution workers'}
              />
              <StatCard
                icon={Layers}
                label="Queue Depth"
                value={data?.queue ? data.queue.depth : '—'}
                accent="var(--warning)"
                sub={
                  data?.queue
                    ? `${data.queue.waiting} waiting · ${data.queue.active} active · ${data.queue.delayed} delayed`
                    : 'Queue not available'
                }
              />
            </div>

            {/* Queue breakdown */}
            {data?.queue && (
              <div className="bg-card border border-border rounded-xl p-5 mb-6">
                <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-warning" />
                  Submissions Queue
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  {([
                    ['Waiting', data.queue.waiting, 'var(--warning)'],
                    ['Active', data.queue.active, 'var(--link)'],
                    ['Delayed', data.queue.delayed, 'var(--muted-foreground)'],
                    ['Completed', data.queue.completed, 'var(--success)'],
                    ['Failed', data.queue.failed, 'var(--destructive)'],
                  ] as [string, number, string][]).map(([label, val, color]) => (
                    <div key={label} className="bg-background border border-border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="font-bold text-lg" style={{ color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw system info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-link" />
                System Info
              </h2>
              {sysEntries.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No system information available
                  {data && !data.online ? ' — backend is offline.' : '.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {sysEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-4 py-1.5 border-b border-secondary text-sm"
                    >
                      <span className="text-muted-foreground font-mono text-xs">{key}</span>
                      <span className="text-foreground font-mono text-xs text-right break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
