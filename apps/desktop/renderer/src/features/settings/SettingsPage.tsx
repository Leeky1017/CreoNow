import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  IpcInvokeResult,
  IpcRequest,
  IpcResponseData,
} from "@shared/types/ipc-generated";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { SectionHeader } from "@/components/composites/SectionHeader";
import { i18n } from "@/i18n/config";

import "./SettingsPage.css";

type ProviderMode = "openai-compatible" | "openai-byok" | "anthropic-byok";
type ThemeMode = "light" | "dark" | "system";

type AiConfig = IpcResponseData<"ai:config:get">;
type AiTestResult = IpcResponseData<"ai:config:test">;
type AiConfigPatch = IpcRequest<"ai:config:update">["patch"];

type AiConfigBridge = {
  get: () => Promise<IpcInvokeResult<"ai:config:get">>;
  test: () => Promise<IpcInvokeResult<"ai:config:test">>;
  update: (patch: AiConfigPatch) => Promise<IpcInvokeResult<"ai:config:update">>;
};

const LS_THEME_KEY = "creonow:theme";
const LS_FONT_SIZE_KEY = "creonow:editor-font-size";
const LS_LANGUAGE_KEY = "creonow:language";
const DEFAULT_FONT_SIZE = "16px";

function readStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(LS_THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "dark";
}

function readStoredFontSize(): string {
  return localStorage.getItem(LS_FONT_SIZE_KEY) ?? DEFAULT_FONT_SIZE;
}

type AppLanguage = "zh" | "en";

function readStoredLanguage(): AppLanguage {
  const stored = localStorage.getItem(LS_LANGUAGE_KEY);
  if (stored === "zh" || stored === "en") {
    return stored;
  }
  return (i18n.language as AppLanguage) ?? "zh";
}

function resolveEffectiveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyThemeToDocument(mode: ThemeMode): void {
  const effective = resolveEffectiveTheme(mode);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(effective);
  root.setAttribute("data-theme", effective);
}

function applyFontSizeToDocument(size: string): void {
  document.documentElement.style.setProperty("--text-editor-size", size);
}

interface SettingsPageProps {
  aiBridge?: AiConfigBridge;
}

function createDefaultBridge(): AiConfigBridge | null {
  const api = window.api ?? window.creonow?.api;
  if (!api || !api.ai.getConfig || !api.ai.testConfig || !api.ai.updateConfig) {
    return null;
  }
  return {
    get: () =>
      api.ai.getConfig?.({}) ??
      Promise.resolve({
        ok: false,
        error: { code: "AI_NOT_CONFIGURED", message: "AI 配置接口不可用" },
      }),
    test: () =>
      api.ai.testConfig?.({}) ??
      Promise.resolve({
        ok: false,
        error: { code: "AI_NOT_CONFIGURED", message: "AI 配置接口不可用" },
      }),
    update: (patch) =>
      api.ai.updateConfig?.({ patch }) ??
      Promise.resolve({
        ok: false,
        error: { code: "AI_NOT_CONFIGURED", message: "AI 配置接口不可用" },
      }),
  };
}

function getProviderValues(config: AiConfig, provider: ProviderMode): {
  apiKeyConfigured: boolean;
  baseUrl: string;
} {
  if (provider === "openai-byok") {
    return {
      apiKeyConfigured: config.openAiByokApiKeyConfigured,
      baseUrl: config.openAiByokBaseUrl,
    };
  }
  if (provider === "anthropic-byok") {
    return {
      apiKeyConfigured: config.anthropicByokApiKeyConfigured,
      baseUrl: config.anthropicByokBaseUrl,
    };
  }
  return {
    apiKeyConfigured: config.openAiCompatibleApiKeyConfigured,
    baseUrl: config.openAiCompatibleBaseUrl,
  };
}

function createBaseUrlPatch(provider: ProviderMode, baseUrl: string): Partial<{
  anthropicByokBaseUrl: string;
  openAiByokBaseUrl: string;
  openAiCompatibleBaseUrl: string;
}> {
  if (provider === "openai-byok") {
    return { openAiByokBaseUrl: baseUrl };
  }
  if (provider === "anthropic-byok") {
    return { anthropicByokBaseUrl: baseUrl };
  }
  return { openAiCompatibleBaseUrl: baseUrl };
}

function createApiKeyPatch(provider: ProviderMode, apiKey: string): Partial<{
  anthropicByokApiKey: string;
  openAiByokApiKey: string;
  openAiCompatibleApiKey: string;
}> {
  if (provider === "openai-byok") {
    return { openAiByokApiKey: apiKey };
  }
  if (provider === "anthropic-byok") {
    return { anthropicByokApiKey: apiKey };
  }
  return { openAiCompatibleApiKey: apiKey };
}

function resolveErrorMessage(result: IpcInvokeResult<"ai:config:get"> | IpcInvokeResult<"ai:config:test"> | IpcInvokeResult<"ai:config:update">): string {
  return result.ok ? "" : `${result.error.code}: ${result.error.message}`;
}

export function SettingsPage({ aiBridge }: SettingsPageProps) {
  const { t } = useTranslation();
  const bridge = useMemo(() => aiBridge ?? createDefaultBridge(), [aiBridge]);

  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredTheme);
  const [fontSize, setFontSize] = useState<string>(readStoredFontSize);
  const [language, setLanguage] = useState<AppLanguage>(readStoredLanguage);

  const [providerMode, setProviderMode] = useState<ProviderMode>("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [loadingAiConfig, setLoadingAiConfig] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<AiTestResult | null>(null);

  useEffect(() => {
    applyThemeToDocument(themeMode);
  }, [themeMode]);

  useEffect(() => {
    applyFontSizeToDocument(fontSize);
  }, [fontSize]);

  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeToDocument("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themeMode]);

  const handleThemeChange = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    localStorage.setItem(LS_THEME_KEY, next);
  }, []);

  const handleFontSizeChange = useCallback((next: string) => {
    setFontSize(next);
    localStorage.setItem(LS_FONT_SIZE_KEY, next);
  }, []);

  const handleLanguageChange = useCallback((next: AppLanguage) => {
    setLanguage(next);
    localStorage.setItem(LS_LANGUAGE_KEY, next);
    void i18n.changeLanguage(next);
  }, []);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      if (!bridge) {
        setLoadingAiConfig(false);
        return;
      }

      const result = await bridge.get();
      if (disposed) {
        return;
      }
      if (!result.ok) {
        setErrorMessage(resolveErrorMessage(result));
        setLoadingAiConfig(false);
        return;
      }

      const values = getProviderValues(result.data, result.data.providerMode);
      setProviderMode(result.data.providerMode);
      setBaseUrl(values.baseUrl);
      setApiKeyConfigured(values.apiKeyConfigured);
      setLoadingAiConfig(false);
    };

    void load();

    return () => {
      disposed = true;
    };
  }, [bridge]);

  const handleProviderChange = (nextProvider: ProviderMode) => {
    setProviderMode(nextProvider);
    setTestResult(null);
  };

  const handleSaveAiConfig = async () => {
    if (!bridge) {
      setErrorMessage(t("settings.ai.bridgeUnavailable"));
      return;
    }

    const patch = {
      providerMode,
      ...createBaseUrlPatch(providerMode, baseUrl.trim()),
      ...(apiKey.trim().length > 0 ? createApiKeyPatch(providerMode, apiKey.trim()) : {}),
    };

    const result = await bridge.update(patch);
    if (!result.ok) {
      setErrorMessage(resolveErrorMessage(result));
      return;
    }

    const values = getProviderValues(result.data, result.data.providerMode);
    setProviderMode(result.data.providerMode);
    setBaseUrl(values.baseUrl);
    setApiKeyConfigured(values.apiKeyConfigured);
    setApiKey("");
    setErrorMessage(null);
    setTestResult(null);
  };

  const handleTestAiConfig = async () => {
    if (!bridge) {
      setErrorMessage(t("settings.ai.bridgeUnavailable"));
      return;
    }

    const result = await bridge.test();
    if (!result.ok) {
      setErrorMessage(resolveErrorMessage(result));
      return;
    }

    setErrorMessage(null);
    setTestResult(result.data);
  };

  const apiKeyPlaceholder = apiKeyConfigured ? t("settings.ai.apiKey.configured") : t("settings.ai.apiKey.unconfigured");

  return (
    <div className="cn-settings">
      <h1 className="cn-settings__title">{t("settings.title")}</h1>

      <section className="cn-settings__section">
        <SectionHeader label={t("settings.general")} />
        <div className="cn-settings__group">
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.general.theme")}</span>
            <div className="cn-settings__value">
              <Select
                className="cn-settings__select"
                value={themeMode}
                onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
                data-testid="settings-theme-select"
              >
                <option value="light">{t("settings.general.theme.light")}</option>
                <option value="dark">{t("settings.general.theme.dark")}</option>
                <option value="system">{t("settings.general.theme.system")}</option>
              </Select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.general.language")}</span>
            <div className="cn-settings__value">
              <Select
                className="cn-settings__select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as AppLanguage)}
                data-testid="settings-language-select"
              >
                <option value="zh">{t("settings.general.language.zh")}</option>
                <option value="en">{t("settings.general.language.en")}</option>
              </Select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.general.fontSize")}</span>
            <div className="cn-settings__value">
              <Select
                className="cn-settings__select"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value)}
                data-testid="settings-font-size-select"
              >
                <option value="14px">14px</option>
                <option value="15px">15px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <section className="cn-settings__section">
        <SectionHeader label={t("settings.ai")} />
        <div className="cn-settings__group">
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.provider")}</span>
            <div className="cn-settings__value">
              <Select
                className="cn-settings__select"
                data-testid="ai-provider-mode"
                value={providerMode}
                onChange={(event) => handleProviderChange(event.target.value as ProviderMode)}
              >
                <option value="openai-compatible">openai-compatible</option>
                <option value="openai-byok">openai-byok</option>
                <option value="anthropic-byok">anthropic-byok</option>
              </Select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.baseUrl")}</span>
            <div className="cn-settings__value">
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                data-testid="ai-base-url"
                placeholder="https://api.openai.com/v1"
                disabled={loadingAiConfig}
              />
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.apiKey")}</span>
            <div className="cn-settings__value">
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                data-testid="ai-api-key"
                placeholder={apiKeyPlaceholder}
                disabled={loadingAiConfig}
              />
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.actions")}</span>
            <div className="cn-settings__value cn-settings__api-key-group">
              <Button
                tone="secondary"
                data-testid="ai-save-btn"
                onClick={() => {
                  void handleSaveAiConfig();
                }}
                disabled={loadingAiConfig}
              >
                {t("settings.ai.save")}
              </Button>
              <Button
                tone="secondary"
                data-testid="ai-test-btn"
                onClick={() => {
                  void handleTestAiConfig();
                }}
                disabled={loadingAiConfig}
              >
                {t("settings.ai.verify")}
              </Button>
            </div>
          </div>
          {errorMessage ? <span data-testid="ai-error">{errorMessage}</span> : null}
          {testResult ? (
            <span data-testid="ai-test-result">
              {testResult.ok ? t("settings.ai.testSuccess", { latency: testResult.latencyMs }) : `${testResult.error?.code ?? "UNKNOWN"} (${testResult.latencyMs}ms)`}
            </span>
          ) : null}
        </div>
      </section>

      <section className="cn-settings__section">
        <SectionHeader label={t("settings.about")} />
        <div className="cn-settings__group">
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.about.version")}</span>
            <span className="cn-settings__static">CreoNow v0.1.0</span>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.about.license")}</span>
            <span className="cn-settings__static">MIT</span>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.about.description")}</span>
            <span className="cn-settings__static">{t("settings.about.descriptionText")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
