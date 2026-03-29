import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileDown } from 'lucide-react';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/cn';

type ExportFormat = 'markdown' | 'docx' | 'pdf' | 'txt';

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport?: (format: ExportFormat) => void;
}

const FORMAT_OPTIONS: ExportFormat[] = ['markdown', 'docx', 'pdf', 'txt'];

export function ExportDialog({ open, onClose, onExport }: ExportDialogProps) {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [exporting, setExporting] = useState(false);

  if (!open) return null;

  const handleExport = async () => {
    setExporting(true);
    await new Promise<void>((r) => setTimeout(r, 800));
    onExport?.(selectedFormat);
    setExporting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t('export.title')}
    >
      <div className="w-[420px] bg-modal rounded-xl border border-border shadow-(--shadow-xl) overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileDown size={16} strokeWidth={1.5} className="text-accent" />
            <h2 className="text-sm font-semibold text-foreground">{t('export.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors duration-fast"
            aria-label={t('export.cancel')}
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Format */}
          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground mb-2">
              {t('export.format')}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm text-left',
                    'border transition-colors duration-fast',
                    selectedFormat === fmt
                      ? 'border-accent bg-accent-subtle text-foreground'
                      : 'border-border bg-transparent text-muted-foreground hover:bg-hover-overlay hover:text-foreground',
                  )}
                >
                  {t(`export.formats.${fmt}`)}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Output path */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t('export.path')}</span>
            <span className="text-sm text-foreground font-mono truncate bg-muted px-3 py-1.5 rounded-md">
              ~/Documents/export.{selectedFormat === 'markdown' ? 'md' : selectedFormat}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={exporting}>
            {t('export.cancel')}
          </Button>
          <Button size="sm" onClick={() => void handleExport()} loading={exporting}>
            {exporting ? t('export.exporting') : t('export.export')}
          </Button>
        </div>
      </div>
    </div>
  );
}
