import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

export type AppToastVariant = "info" | "success" | "warning" | "error";

export interface AppToastOptions {
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
  duration?: number;
  title: string;
  variant?: AppToastVariant;
}

interface ToastRecord {
  action?: AppToastOptions["action"];
  description?: string;
  duration: number;
  id: string;
  title: string;
  variant: AppToastVariant;
}

interface AppToastContextValue {
  dismissToast: (id: string) => void;
  showToast: (options: AppToastOptions) => string;
}

const DEFAULT_TOAST_DURATION_MS = 5000;
const ERROR_TOAST_DURATION_MS = 8000;
const AppToastContext = createContext<AppToastContextValue | null>(null);
let nextToastId = 0;

function getToastDuration(options: AppToastOptions, variant: AppToastVariant): number {
  if (options.duration !== undefined) {
    return options.duration;
  }

  return variant === "error" ? ERROR_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS;
}

function ToastViewport(props: {
  onDismiss: (id: string) => void;
  toasts: ToastRecord[];
}) {
  const { t } = useTranslation();

  if (props.toasts.length === 0) {
    return null;
  }

  return <div className="toast-viewport" aria-label={t("toast.viewportLabel") }>
    {props.toasts.map((toast) => {
      const liveMode = toast.variant === "error" ? "assertive" : "polite";
      const role = toast.variant === "error" ? "alert" : "status";

      return <section
        key={toast.id}
        className={`toast-card toast-card--${toast.variant}`}
        role={role}
        aria-live={liveMode}
      >
        <div className="toast-copy">
          <h2 className="toast-heading">{toast.title}</h2>
          {toast.description ? <p className="toast-description">{toast.description}</p> : null}
        </div>
        <div className="toast-actions">
          {toast.action ? (
            <Button
              className="toast-action"
              tone="ghost"
              onClick={() => {
                toast.action?.onClick();
                props.onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </Button>
          ) : null}
          <Button className="toast-dismiss" tone="ghost" onClick={() => props.onDismiss(toast.id)}>
            {t("toast.close")}
          </Button>
        </div>
      </section>;
    })}
  </div>;
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timerIdsRef = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timerId = timerIdsRef.current.get(id);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      timerIdsRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => () => {
    timerIdsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    timerIdsRef.current.clear();
  }, []);

  const showToast = useCallback((options: AppToastOptions) => {
    const id = `toast-${nextToastId++}`;
    const variant = options.variant ?? "info";
    const record: ToastRecord = {
      action: options.action,
      description: options.description,
      duration: getToastDuration(options, variant),
      id,
      title: options.title,
      variant,
    };

    setToasts((current) => [...current, record]);

    if (record.duration > 0) {
      const timerId = window.setTimeout(() => {
        dismissToast(id);
      }, record.duration);
      timerIdsRef.current.set(id, timerId);
    }

    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({ dismissToast, showToast }), [dismissToast, showToast]);

  return <AppToastContext.Provider value={value}>
    {children}
    <ToastViewport toasts={toasts} onDismiss={dismissToast} />
  </AppToastContext.Provider>;
}

export function useAppToast(): AppToastContextValue {
  const context = useContext(AppToastContext);
  if (context === null) {
    throw new Error("AppToastProvider is required before useAppToast");
  }

  return context;
}
