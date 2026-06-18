import { Link, useNavigate } from 'react-router-dom';
import { Code, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 pointer-events-none" />

      <div className="relative text-center max-w-md">
        <div className="inline-flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-brand flex items-center justify-center">
            <Code className="w-6 h-6 text-white" />
          </div>
          <span className="text-foreground font-bold text-2xl tracking-tight">CodeMentor</span>
        </div>

        <div className="font-mono text-[120px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-border to-background select-none">
          404
        </div>

        <h1 className="text-2xl font-bold text-foreground mt-2">Page not found</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground text-sm hover:text-foreground hover:border-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
