import { useRef, useState } from 'react';
import api from '../../lib/api';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ZipImportButtonProps {
  onImported?: () => void;
}

type Status = 'idle' | 'uploading' | 'success' | 'error';

export function ZipImportButton({ onImported }: ZipImportButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const reset = () => {
    setStatus('idle');
    setMessage('');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/problem-import/zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        const count = res.data.data?.test_count ?? 0;
        setStatus('success');
        setMessage(`Imported with ${count} test case${count === 1 ? '' : 's'}`);
        onImported?.();
        setTimeout(reset, 3500);
      } else {
        setStatus('error');
        setMessage(res.data?.error || 'Import failed');
        setTimeout(reset, 4000);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.error || 'Import failed — check the ZIP format');
      setTimeout(reset, 4000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === 'uploading'}
        className="flex items-center gap-2 px-4 py-2 border border-border bg-card text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50"
        title="Import a problem from a .zip package (problem.json + tests/N.in/N.out)"
      >
        {status === 'uploading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {status === 'uploading' ? 'Importing…' : 'Import ZIP'}
      </button>

      {status === 'success' && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-success">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {message}
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {message}
        </span>
      )}
    </div>
  );
}
