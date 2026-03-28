import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-4">
          <p className="text-destructive">Application crashed</p>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-accent text-background"
            onClick={() => this.setState({ hasError: false })}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
