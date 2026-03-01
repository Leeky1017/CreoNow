import React from "react";

export type OpenSettingsTarget =
  | "general"
  | "appearance"
  | "ai"
  | "judge"
  | "analytics"
  | "account";

type OpenSettingsHandler = (target?: OpenSettingsTarget) => void;

export const OpenSettingsContext =
  React.createContext<OpenSettingsHandler | null>(null);

const noopOpenSettings: OpenSettingsHandler = () => {};

export function useOpenSettings(): OpenSettingsHandler {
  return React.useContext(OpenSettingsContext) ?? noopOpenSettings;
}
