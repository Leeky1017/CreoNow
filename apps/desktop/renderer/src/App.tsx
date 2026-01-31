import React from "react";

import { AppShell } from "./components/layout/AppShell";
import { createPreferenceStore } from "./lib/preferences";
import { createLayoutStore, LayoutStoreProvider } from "./stores/layoutStore";

/**
 * App bootstraps renderer stores and mounts the Workbench shell.
 */
export function App(): JSX.Element {
  const layoutStore = React.useMemo(() => {
    const preferences = createPreferenceStore(window.localStorage);
    return createLayoutStore(preferences);
  }, []);

  return (
    <LayoutStoreProvider store={layoutStore}>
      <AppShell />
    </LayoutStoreProvider>
  );
}
