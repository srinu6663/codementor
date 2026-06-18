import { Download } from 'lucide-react';
import { exportCsv } from '../../lib/exportCsv';

// Small "CSV" link for a chart card header — exports the chart's underlying data.
// Generic over the row shape so typed chart datasets pass without an index signature.
export function CsvButton<T extends object>({ rows, filename }: { rows: readonly T[]; filename: string }) {
  return (
    <button
      onClick={() => exportCsv(filename, rows as unknown as Record<string, unknown>[])}
      disabled={!rows?.length}
      title="Download this chart's data as CSV"
      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
    >
      <Download className="w-3 h-3" /> CSV
    </button>
  );
}
