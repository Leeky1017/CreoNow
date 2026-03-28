import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

interface InnerProps extends Props {
  t: (key: string) => string;
}

interface State {
  hasError: boolean;
}

class AppErrorBoundaryInner extends Component<InnerProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-4">
          <p className="text-destructive">{t('app.error.crash')}</p>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-accent text-background"
            onClick={() => this.setState({ hasError: false })}
          >
            {t('app.error.reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: Props) {
  const { t } = useTranslation();
  return <AppErrorBoundaryInner t={t}>{children}</AppErrorBoundaryInner>;
}
