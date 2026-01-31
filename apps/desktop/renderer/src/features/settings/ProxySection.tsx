import React from "react";

import { invoke } from "../../lib/ipcClient";

type ProxySettings = {
  enabled: boolean;
  baseUrl: string;
  apiKeyConfigured: boolean;
};

/**
 * ProxySection controls optional OpenAI-compatible proxy settings.
 *
 * Why: proxy settings must be managed in the main process (secrets) while still
 * being user-configurable and E2E-testable.
 */
export function ProxySection(): JSX.Element {
  const [status, setStatus] = React.useState<"idle" | "loading">("idle");
  const [settings, setSettings] = React.useState<ProxySettings | null>(null);
  const [enabled, setEnabled] = React.useState(false);
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKeyDraft, setApiKeyDraft] = React.useState("");
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [testResult, setTestResult] = React.useState<string | null>(null);

  async function refresh(): Promise<void> {
    setStatus("loading");
    setErrorText(null);
    setTestResult(null);

    const res = await invoke("ai:proxy:settings:get", {});
    if (!res.ok) {
      setStatus("idle");
      setErrorText(`${res.error.code}: ${res.error.message}`);
      return;
    }

    setStatus("idle");
    setSettings(res.data as unknown as ProxySettings);
    setEnabled(res.data.enabled);
    setBaseUrl(res.data.baseUrl);
  }

  React.useEffect(() => {
    void refresh();
  }, []);

  async function onSave(): Promise<void> {
    setErrorText(null);
    setTestResult(null);

    const patch: Partial<{ enabled: boolean; baseUrl: string; apiKey: string }> = {
      enabled,
      baseUrl,
    };
    if (apiKeyDraft.trim().length > 0) {
      patch.apiKey = apiKeyDraft;
    }

    const res = await invoke("ai:proxy:settings:update", { patch });
    if (!res.ok) {
      setErrorText(`${res.error.code}: ${res.error.message}`);
      return;
    }

    setSettings(res.data as unknown as ProxySettings);
    setApiKeyDraft("");
  }

  async function onTest(): Promise<void> {
    setErrorText(null);
    setTestResult(null);

    const res = await invoke("ai:proxy:test", {});
    if (!res.ok) {
      setErrorText(`${res.error.code}: ${res.error.message}`);
      return;
    }

    if (res.data.ok) {
      setTestResult(`ok (${res.data.latencyMs}ms)`);
      return;
    }

    setTestResult(
      `${res.data.error?.code ?? "ERROR"}: ${res.data.error?.message ?? "failed"} (${res.data.latencyMs}ms)`,
    );
  }

  return (
    <section
      data-testid="settings-proxy-section"
      style={{
        padding: 12,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-default)",
        background: "var(--color-bg-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>Proxy</div>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          data-testid="proxy-enabled"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Enable OpenAI-compatible proxy (LiteLLM)
        </div>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Base URL
        </div>
        <input
          data-testid="proxy-base-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.currentTarget.value)}
          placeholder="https://your-proxy.example.com"
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          API key (optional)
        </div>
        <input
          data-testid="proxy-api-key"
          type="password"
          value={apiKeyDraft}
          onChange={(e) => setApiKeyDraft(e.currentTarget.value)}
          placeholder={
            settings?.apiKeyConfigured ? "(configured)" : "(not configured)"
          }
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
          }}
        />
      </div>

      {errorText ? (
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          {errorText}
        </div>
      ) : null}

      {testResult ? (
        <div style={{ fontSize: 12, color: "var(--color-fg-muted)" }}>
          Test: {testResult}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          data-testid="proxy-save"
          type="button"
          onClick={() => void onSave()}
          disabled={status === "loading"}
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <button
          data-testid="proxy-test"
          type="button"
          onClick={() => void onTest()}
          disabled={status === "loading"}
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
          }}
        >
          Test
        </button>
        <button
          data-testid="proxy-refresh"
          type="button"
          onClick={() => void refresh()}
          disabled={status === "loading"}
          style={{
            height: 32,
            padding: "0 var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            color: "var(--color-fg-default)",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          Refresh
        </button>
      </div>
    </section>
  );
}

