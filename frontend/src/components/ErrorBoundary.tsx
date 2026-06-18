import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Code, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
              <span className="text-foreground font-bold text-2xl tracking-tight">CodeMentor</span>
            </div>

            <div className="bg-card border border-destructive/30 p-8 text-left">
              <h2 className="text-foreground font-semibold text-lg mb-2">Something went wrong</h2>
              <p className="text-muted-foreground text-sm mb-4">
                An unexpected error occurred. Try refreshing the page.
              </p>
              {this.state.error && (
                <pre className="text-destructive text-xs bg-background border border-border p-3 overflow-auto max-h-32 font-mono">
                  {this.state.error.message}
                </pre>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-5 flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
