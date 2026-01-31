import React from "react";

import { AppShell } from "./components/layout/AppShell";
import { invoke } from "./lib/ipcClient";
import { createPreferenceStore } from "./lib/preferences";
import { createAiStore, AiStoreProvider } from "./stores/aiStore";
import {
  createContextStore,
  ContextStoreProvider,
} from "./stores/contextStore";
import { createEditorStore, EditorStoreProvider } from "./stores/editorStore";
import { createFileStore, FileStoreProvider } from "./stores/fileStore";
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

  const aiStore = React.useMemo(() => {
    return createAiStore({ invoke });
  }, []);

  const contextStore = React.useMemo(() => {
    return createContextStore({ invoke });
  }, []);

  const fileStore = React.useMemo(() => {
    return createFileStore({ invoke });
  }, []);

  return (
    <AiStoreProvider store={aiStore}>
      <ProjectStoreProvider store={projectStore}>
        <ContextStoreProvider store={contextStore}>
          <EditorStoreProvider store={editorStore}>
            <FileStoreProvider store={fileStore}>
              <LayoutStoreProvider store={layoutStore}>
                <AppShell />
              </LayoutStoreProvider>
            </FileStoreProvider>
          </EditorStoreProvider>
        </ContextStoreProvider>
      </ProjectStoreProvider>
    </AiStoreProvider>
  );
}
