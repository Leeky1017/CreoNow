export interface SettingsData {
  theme: "light" | "dark" | "system";
  language: "zh" | "en";
  fontSize: string;
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;
  aiBudget: string;
  version: string;
  license: string;
}

export const mockSettings: SettingsData = {
  theme: "light",
  language: "zh",
  fontSize: "16px",
  aiProvider: "OpenAI",
  aiApiKey: "sk-••••••••••••••••••••",
  aiModel: "gpt-4o",
  aiBudget: "¥100",
  version: "v0.1.0-alpha",
  license: "MIT",
};
