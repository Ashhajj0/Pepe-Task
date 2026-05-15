import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Protocol Disruption</h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed max-w-[260px]">
            The system encountered an unexpected synchronization failure. Session data is protected.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-emerald-500 text-black px-8 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all"
          >
            <RefreshCw size={16} />
            Re-sync App
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-zinc-900 rounded-xl text-left overflow-auto max-w-full">
              <p className="text-[10px] font-mono text-red-400">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
