import React from "react";

import { AppShell } from "./components/layout/AppShell";
import { OnboardingPage } from "./features/onboarding";
import { invoke } from "./lib/ipcClient";
import { createPreferenceStore } from "./lib/preferences";
import { createAiStore, AiStoreProvider } from "./stores/aiStore";
import {
  createContextStore,
  ContextStoreProvider,
} from "./stores/contextStore";
import { createEditorStore, EditorStoreProvider } from "./stores/editorStore";
import { createFileStore, FileStoreProvider } from "./stores/fileStore";
import { createKgStore, KgStoreProvider } from "./stores/kgStore";
import { createLayoutStore, LayoutStoreProvider } from "./stores/layoutStore";
import { createMemoryStore, MemoryStoreProvider } from "./stores/memoryStore";
import {
  createOnboardingStore,
  OnboardingStoreProvider,
  useOnboardingStore,
} from "./stores/onboardingStore";
import { createSearchStore, SearchStoreProvider } from "./stores/searchStore";
import {
  createThemeStore,
  ThemeStoreProvider,
  type ThemeMode,
} from "./stores/themeStore";
import {
  createProjectStore,
  ProjectStoreProvider,
} from "./stores/projectStore";

/**
 * AppRouter decides which screen to show based on onboarding status.
 *
 * Why: First-time users should see the onboarding flow before the main app.
 */
function AppRouter(): JSX.Element {
  const onboardingCompleted = useOnboardingStore((s) => s.completed);
  const completeOnboarding = useOnboardingStore((s) => s.complete);

  if (!onboardingCompleted) {
    return <OnboardingPage onComplete={completeOnboarding} />;
  }

  return <AppShell />;
}

/**
 * App bootstraps renderer stores and mounts the Workbench shell.
 */
export function App(): JSX.Element {
  const preferences = React.useMemo(() => {
    return createPreferenceStore(window.localStorage);
  }, []);

  const themeStore = React.useMemo(() => {
    return createThemeStore(preferences);
  }, [preferences]);

  React.useLayoutEffect(() => {
    function apply(mode: ThemeMode): void {
      document.documentElement.setAttribute("data-theme", mode);
    }

    apply(themeStore.getState().mode);
    const unsubscribe = themeStore.subscribe((state) => {
      apply(state.mode);
    });
    return unsubscribe;
  }, [themeStore]);

  const layoutStore = React.useMemo(() => {
    return createLayoutStore(preferences);
  }, [preferences]);

  const onboardingStore = React.useMemo(() => {
    return createOnboardingStore(preferences);
  }, [preferences]);

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

  const kgStore = React.useMemo(() => {
    return createKgStore({ invoke });
  }, []);

  const searchStore = React.useMemo(() => {
    return createSearchStore({ invoke });
  }, []);

  const memoryStore = React.useMemo(() => {
    return createMemoryStore({ invoke });
  }, []);

  return (
    <ThemeStoreProvider store={themeStore}>
      <OnboardingStoreProvider store={onboardingStore}>
        <AiStoreProvider store={aiStore}>
          <ProjectStoreProvider store={projectStore}>
            <ContextStoreProvider store={contextStore}>
              <EditorStoreProvider store={editorStore}>
                <FileStoreProvider store={fileStore}>
                  <KgStoreProvider store={kgStore}>
                    <SearchStoreProvider store={searchStore}>
                      <MemoryStoreProvider store={memoryStore}>
                        <LayoutStoreProvider store={layoutStore}>
                          <AppRouter />
                        </LayoutStoreProvider>
                      </MemoryStoreProvider>
                    </SearchStoreProvider>
                  </KgStoreProvider>
                </FileStoreProvider>
              </EditorStoreProvider>
            </ContextStoreProvider>
          </ProjectStoreProvider>
        </AiStoreProvider>
      </OnboardingStoreProvider>
    </ThemeStoreProvider>
  );
}
