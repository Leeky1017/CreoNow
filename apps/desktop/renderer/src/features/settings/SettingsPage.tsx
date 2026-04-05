import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { SectionHeader } from "@/components/composites/SectionHeader";

import type { SettingsData } from "./mockData";
import { mockSettings } from "./mockData";

import "./SettingsPage.css";

interface SettingsPageProps {
  settings?: SettingsData;
}

export function SettingsPage({ settings = mockSettings }: SettingsPageProps) {
  const { t } = useTranslation();

  return (
    <div className="cn-settings">
      <h1 className="cn-settings__title">{t("settings.title")}</h1>

      {/* ── General ──────────────────────── */}
      <section className="cn-settings__section">
        <SectionHeader label={t("settings.general")} />
        <div className="cn-settings__group">
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.general.theme")}</span>
            <div className="cn-settings__value">
              <select className="cn-settings__select" defaultValue={settings.theme}>
                <option value="light">{t("settings.general.theme.light")}</option>
                <option value="dark">{t("settings.general.theme.dark")}</option>
                <option value="system">{t("settings.general.theme.system")}</option>
              </select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.general.language")}</span>
            <div className="cn-settings__value">
              <select className="cn-settings__select" defaultValue={settings.language}>
                <option value="zh">{t("settings.general.language.zh")}</option>
                <option value="en">{t("settings.general.language.en")}</option>
              </select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.general.fontSize")}</span>
            <div className="cn-settings__value">
              <select className="cn-settings__select" defaultValue={settings.fontSize}>
                <option value="14px">14px</option>
                <option value="15px">15px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI ───────────────────────────── */}
      <section className="cn-settings__section">
        <SectionHeader label={t("settings.ai")} />
        <div className="cn-settings__group">
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.provider")}</span>
            <div className="cn-settings__value">
              <select className="cn-settings__select" defaultValue={settings.aiProvider}>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="DeepSeek">DeepSeek</option>
              </select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.apiKey")}</span>
            <div className="cn-settings__value">
              <div className="cn-settings__api-key-group">
                <Input
                  type="password"
                  defaultValue={settings.aiApiKey}
                  placeholder={t("settings.ai.apiKey.placeholder")}
                />
                <Button tone="secondary" className="cn-settings__verify">
                  {t("settings.ai.verify")}
                </Button>
              </div>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.model")}</span>
            <div className="cn-settings__value">
              <select className="cn-settings__select" defaultValue={settings.aiModel}>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="claude-sonnet-4">claude-sonnet-4</option>
              </select>
            </div>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.ai.budget")}</span>
            <div className="cn-settings__value">
              <Input
                type="text"
                defaultValue={settings.aiBudget}
                className="cn-settings__budget-input"
                style={{ maxWidth: 80, textAlign: "right" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────── */}
      <section className="cn-settings__section">
        <SectionHeader label={t("settings.about")} />
        <div className="cn-settings__group">
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.about.version")}</span>
            <span className="cn-settings__static">{settings.version}</span>
          </div>
          <div className="cn-settings__row">
            <span className="cn-settings__label">{t("settings.about.license")}</span>
            <span className="cn-settings__static">{settings.license}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
