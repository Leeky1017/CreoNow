import { ArrowRight, BookOpen, Check, Film, Hash, PenTool, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/primitives/Button";

interface WelcomeScreenProps {
  onComplete: (selectedScenarios: string[]) => void;
}

const SCENARIO_OPTIONS = [
  { id: "novel", icon: BookOpen, labelKey: "welcome.scenario.novel", descKey: "welcome.scenario.novel.desc" },
  { id: "script", icon: Film, labelKey: "welcome.scenario.script", descKey: "welcome.scenario.script.desc" },
  { id: "social", icon: Hash, labelKey: "welcome.scenario.social", descKey: "welcome.scenario.social.desc" },
  { id: "diary", icon: PenTool, labelKey: "welcome.scenario.diary", descKey: "welcome.scenario.diary.desc" },
] as const;

export function WelcomeScreen(props: WelcomeScreenProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  return (
    <div
      className="welcome-screen"
      data-testid="welcome-screen"
      role="dialog"
      aria-modal="true"
      aria-label={t("welcome.title")}
    >
      {step === 1 ? (
        <div className="welcome-screen__intro">
          <div className="welcome-screen__badge">
            <Sparkles size={18} />
            <span>{t("welcome.badge")}</span>
          </div>
          <h1>{t("welcome.title")}</h1>
          <p>{t("welcome.subtitle")}</p>
          <Button
            tone="primary"
            onClick={() => setStep(2)}
            data-testid="welcome-start-btn"
          >
            {t("welcome.start")}
            <ArrowRight size={14} />
          </Button>
        </div>
      ) : (
        <div className="welcome-screen__selection">
          <header>
            <h2>{t("welcome.selection.title")}</h2>
            <p>{t("welcome.selection.subtitle")}</p>
          </header>
          <div className="welcome-screen__grid">
            {SCENARIO_OPTIONS.map((scenario) => {
              const selected = selectedScenarios.includes(scenario.id);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className={selected ? "welcome-card is-active" : "welcome-card"}
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedScenarios((current) =>
                      current.includes(scenario.id)
                        ? current.filter((item) => item !== scenario.id)
                        : [...current, scenario.id],
                    )}
                  data-testid={`welcome-scenario-${scenario.id}`}
                >
                  <div className="welcome-card__head">
                    <scenario.icon size={16} />
                    {selected ? <Check size={14} aria-hidden="true" /> : null}
                  </div>
                  <p className="welcome-card__title">{t(scenario.labelKey)}</p>
                  <p className="welcome-card__desc">{t(scenario.descKey)}</p>
                </button>
              );
            })}
          </div>
          <div className="welcome-screen__footer">
            <Button tone="ghost" onClick={() => setStep(1)}>{t("welcome.back")}</Button>
            <Button
              tone="primary"
              disabled={selectedScenarios.length === 0}
              onClick={() => props.onComplete(selectedScenarios)}
              data-testid="welcome-complete-btn"
            >
              {t("welcome.complete")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
