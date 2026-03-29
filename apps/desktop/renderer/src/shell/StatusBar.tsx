import { useTranslation } from 'react-i18next';
import { GitBranch } from 'lucide-react';

export function StatusBar() {
  const { t } = useTranslation();

  return (
    <footer className="flex items-center justify-between h-7 px-3 bg-card border-t border-border text-xs text-muted-foreground shrink-0 select-none">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <span>
          12,450 {t('statusBar.words')}
        </span>
        <span className="text-border">|</span>
        <span>
          {t('statusBar.line')} 42, {t('statusBar.column')} 18
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        <span>
          {t('statusBar.encoding')}: UTF-8
        </span>
        <span className="text-border">|</span>
        <span className="flex items-center gap-1">
          <GitBranch size={12} strokeWidth={1.5} />
          main
        </span>
      </div>
    </footer>
  );
}
