import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import api from '../../lib/api';

export function ExportPdfButton({ problemId, label }: { problemId: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/pdf/problems/${problemId}/pdf`, {
        responseType: 'blob',
      });

      // Derive a filename from the Content-Disposition header when present.
      let filename = `problem-${problemId}.pdf`;
      const disposition = res.headers?.['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title="Export PDF"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card text-muted-foreground text-xs font-medium hover:text-foreground hover:border-muted-foreground transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {label ?? 'PDF'}
    </button>
  );
}

export default ExportPdfButton;
