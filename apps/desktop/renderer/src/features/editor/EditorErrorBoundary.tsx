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

class EditorErrorBoundaryInner extends Component<InnerProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[EditorErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="flex flex-col items-center justify-center h-full bg-background text-foreground gap-4">
          <p className="text-destructive">{t('editor.error.title')}</p>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-accent text-accent-foreground transition-colors duration-fast ease-out hover:bg-accent-hover"
            onClick={() => this.setState({ hasError: false })}
          >
            {t('editor.error.retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function EditorErrorBoundary({ children }: Props) {
  const { t } = useTranslation();
  return <EditorErrorBoundaryInner t={t}>{children}</EditorErrorBoundaryInner>;
}
