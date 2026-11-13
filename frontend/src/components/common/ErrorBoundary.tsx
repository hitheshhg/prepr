import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[var(--canvas-bg)] text-[var(--text-main)] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bento-card border border-[var(--bento-border)] bg-[var(--bento-bg)] shadow-2xl text-center">
            {/* Warning Icon */}
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <span className="wix-pill text-[10px]">
              UI Runtime Handled
            </span>

            <h2 className="text-xl sm:text-2xl font-bold mt-3">
              Something went wrong
            </h2>

            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              prepr intercepted an unexpected interface error. Your session data and evaluations are safely persisted in MongoDB Atlas.
            </p>

            {/* Recovery Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-wider font-semibold transition hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Platform
              </button>

              <button
                type="button"
                onClick={this.handleHome}
                className="py-2.5 px-4 rounded-xl bg-neutral-500/10 hover:bg-neutral-500/20 border border-[var(--bento-border)] text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" /> Return Home
              </button>
            </div>

            {/* Expandable Technical Diagnostics */}
            <div className="mt-6 pt-4 border-t border-[var(--bento-border)] text-left">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-between w-full transition-colors"
              >
                <span>Technical Diagnostics</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] font-mono text-[10px] text-rose-500 max-h-40 overflow-y-auto space-y-1">
                  <div className="font-bold">{this.state.error?.toString()}</div>
                  <pre className="text-[var(--text-muted)] whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
