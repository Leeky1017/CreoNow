import { Monitor, Sparkles, User, X, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

type SettingsModalTab = "agent" | "appearance" | "profile";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SETTINGS_MODAL_TABS: Array<{
  icon: typeof User;
  id: SettingsModalTab;
  labelKey: string;
}> = [
  { id: "profile", icon: User, labelKey: "settingsModal.tab.profile" },
  { id: "agent", icon: Sparkles, labelKey: "settingsModal.tab.agent" },
  { id: "appearance", icon: Monitor, labelKey: "settingsModal.tab.appearance" },
];

export function SettingsModal(props: SettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsModalTab>("profile");

  if (props.isOpen === false) {
    return null;
  }

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("settingsModal.title")}
        onClick={(event) => event.stopPropagation()}
        data-testid="settings-modal"
      >
        <header className="settings-modal__header">
          <div>
            <h2 className="settings-modal__title">{t("settingsModal.title")}</h2>
            <p className="settings-modal__subtitle">{t("settingsModal.subtitle")}</p>
          </div>
          <Button tone="ghost" onClick={props.onClose} aria-label={t("actions.close")} data-testid="settings-modal-close">
            <X size={14} />
          </Button>
        </header>

        <div className="settings-modal__layout">
          <nav className="settings-modal__tabs" aria-label={t("settingsModal.tabsLabel")}>
            {SETTINGS_MODAL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? "settings-modal__tab is-active" : "settings-modal__tab"}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`settings-modal-tab-${tab.id}`}
              >
                <tab.icon size={14} />
                <span>{t(tab.labelKey)}</span>
              </button>
            ))}
          </nav>

          <section className="settings-modal__content">
            {activeTab === "profile" ? (
              <div className="settings-modal__card" data-testid="settings-modal-panel-profile">
                <h3>{t("settingsModal.profile.title")}</h3>
                <p>{t("settingsModal.profile.desc")}</p>
                <dl>
                  <div>
                    <dt>{t("settingsModal.profile.identity")}</dt>
                    <dd>{t("settingsModal.profile.identityValue")}</dd>
                  </div>
                  <div>
                    <dt>{t("settingsModal.profile.workspace")}</dt>
                    <dd>{t("settingsModal.profile.workspaceValue")}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {activeTab === "agent" ? (
              <div className="settings-modal__card" data-testid="settings-modal-panel-agent">
                <h3>{t("settingsModal.agent.title")}</h3>
                <p>{t("settingsModal.agent.desc")}</p>
                <ul>
                  <li>{t("settingsModal.agent.feature.memory")}</li>
                  <li>{t("settingsModal.agent.feature.guardrails")}</li>
                  <li>{t("settingsModal.agent.feature.autosave")}</li>
                </ul>
              </div>
            ) : null}

            {activeTab === "appearance" ? (
              <div className="settings-modal__card" data-testid="settings-modal-panel-appearance">
                <h3>{t("settingsModal.appearance.title")}</h3>
                <p>{t("settingsModal.appearance.desc")}</p>
                <div className="settings-modal__appearance-actions">
                  <Button tone="secondary">{t("settingsModal.appearance.theme")}</Button>
                  <Button tone="secondary">
                    <Zap size={14} />
                    {t("settingsModal.appearance.motion")}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
