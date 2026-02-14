import React from "react";

export const OpenSettingsContext = React.createContext<(() => void) | null>(
  null,
);

const noopOpenSettings = () => {};

export function useOpenSettings(): () => void {
  return React.useContext(OpenSettingsContext) ?? noopOpenSettings;
}
