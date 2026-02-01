import React from "react";

import { Button } from "../../components/primitives/Button";
import { Card } from "../../components/primitives/Card";
import { Checkbox } from "../../components/primitives/Checkbox";
import { Input } from "../../components/primitives/Input";
import { Text } from "../../components/primitives/Text";
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
    <Card
      data-testid="settings-proxy-section"
      variant="raised"
      className="flex flex-col gap-2.5 p-3 rounded-[var(--radius-lg)]"
    >
      <Text size="body" weight="bold">
        Proxy
      </Text>

      <Checkbox
        data-testid="proxy-enabled"
        checked={enabled}
        onCheckedChange={(checked) => setEnabled(checked === true)}
        label="Enable OpenAI-compatible proxy (LiteLLM)"
      />

      <div className="flex flex-col gap-1.5">
        <Text size="small" color="muted">
          Base URL
        </Text>
        <Input
          data-testid="proxy-base-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.currentTarget.value)}
          placeholder="https://your-proxy.example.com"
          fullWidth
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Text size="small" color="muted">
          API key (optional)
        </Text>
        <Input
          data-testid="proxy-api-key"
          type="password"
          value={apiKeyDraft}
          onChange={(e) => setApiKeyDraft(e.currentTarget.value)}
          placeholder={
            settings?.apiKeyConfigured ? "(configured)" : "(not configured)"
          }
          fullWidth
        />
      </div>

      {errorText ? (
        <Text size="small" color="muted">
          {errorText}
        </Text>
      ) : null}

      {testResult ? (
        <Text size="small" color="muted">
          Test: {testResult}
        </Text>
      ) : null}

      <div className="flex gap-2">
        <Button
          data-testid="proxy-save"
          variant="secondary"
          size="sm"
          onClick={() => void onSave()}
          disabled={status === "loading"}
        >
          Save
        </Button>
        <Button
          data-testid="proxy-test"
          variant="secondary"
          size="sm"
          onClick={() => void onTest()}
          disabled={status === "loading"}
        >
          Test
        </Button>
        <Button
          data-testid="proxy-refresh"
          variant="secondary"
          size="sm"
          onClick={() => void refresh()}
          disabled={status === "loading"}
          className="ml-auto"
        >
          Refresh
        </Button>
      </div>
    </Card>
  );
}

