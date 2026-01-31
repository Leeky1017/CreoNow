import React from "react";

import { AppShell } from "./components/layout/AppShell";
import { invoke } from "./lib/ipcClient";
import { createPreferenceStore } from "./lib/preferences";
import { createEditorStore, EditorStoreProvider } from "./stores/editorStore";
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

  const editorStore = React.useMemo(() => {
    return createEditorStore({ invoke });
  }, []);

  return (
    <ProjectStoreProvider store={projectStore}>
      <EditorStoreProvider store={editorStore}>
        <LayoutStoreProvider store={layoutStore}>
          <AppShell />
        </LayoutStoreProvider>
      </EditorStoreProvider>
    </ProjectStoreProvider>
  );
}
