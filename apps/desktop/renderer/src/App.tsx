import React from "react";

import { AppShell } from "./components/layout/AppShell";
import { invoke } from "./lib/ipcClient";
import { createPreferenceStore } from "./lib/preferences";
import { createLayoutStore, LayoutStoreProvider } from "./stores/layoutStore";
import {
  createProjectStore,
  ProjectStoreProvider,
} from "./stores/projectStore";

/**
 * App bootstraps renderer stores and mounts the Workbench shell.
 */
export function App(): JSX.Element {
  const layoutStore = React.useMemo(() => {
    const preferences = createPreferenceStore(window.localStorage);
    return createLayoutStore(preferences);
  }, []);

  const projectStore = React.useMemo(() => {
    return createProjectStore({ invoke });
  }, []);

  return (
    <ProjectStoreProvider store={projectStore}>
      <LayoutStoreProvider store={layoutStore}>
        <AppShell />
      </LayoutStoreProvider>
    </ProjectStoreProvider>
  );
}
