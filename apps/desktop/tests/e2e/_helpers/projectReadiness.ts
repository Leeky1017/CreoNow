import { expect, type Page } from "@playwright/test";

const DEFAULT_EDITOR_READY_TIMEOUT_MS = 30_000;

/**
 * Wait until project IPC endpoints are ready to serve requests.
 */
export async function waitForProjectIpcReady(args: {
  page: Page;
  timeoutMs?: number;
}): Promise<void> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_EDITOR_READY_TIMEOUT_MS;
  await expect
    .poll(
      async () =>
        await args.page.evaluate(async () => {
          if (!window.creonow) {
            return "BRIDGE_MISSING";
          }
          const result = await window.creonow.invoke("project:project:list", {
            includeArchived: true,
          });
          if (result.ok) {
            return "READY";
          }
          return result.error.code;
        }),
      { timeout: timeoutMs },
    )
    .toBe("READY");
}

/**
 * Wait until at least one "create project" entry point is visible.
 */
export async function waitForCreateProjectEntry(args: {
  page: Page;
  timeoutMs?: number;
}): Promise<"welcome" | "dashboard-empty" | "dashboard"> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_EDITOR_READY_TIMEOUT_MS;
  const welcomeCreate = args.page.getByTestId("welcome-create-project");
  const dashboardCreateFirst = args.page.getByTestId("dashboard-create-first");
  const dashboardCreateNew = args.page.getByTestId("dashboard-create-new");

  await expect
    .poll(
      async (): Promise<"welcome" | "dashboard-empty" | "dashboard" | ""> => {
        if (await welcomeCreate.isVisible()) {
          return "welcome";
        }
        if (await dashboardCreateFirst.isVisible()) {
          return "dashboard-empty";
        }
        if (await dashboardCreateNew.isVisible()) {
          return "dashboard";
        }
        return "";
      },
      { timeout: timeoutMs },
    )
    .not.toBe("");

  if (await welcomeCreate.isVisible()) {
    return "welcome";
  }
  if (await dashboardCreateFirst.isVisible()) {
    return "dashboard-empty";
  }
  return "dashboard";
}

/**
 * Wait until project creation fully transitions into an editable editor state.
 *
 * Why: Windows CI startup timing is variable; tests must wait on observable
 * conditions instead of fixed sleeps.
 */
export async function waitForEditorReady(args: {
  page: Page;
  timeoutMs?: number;
}): Promise<void> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_EDITOR_READY_TIMEOUT_MS;

  const createDialog = args.page.getByTestId("create-project-dialog");
  await expect(createDialog).toBeHidden({ timeout: timeoutMs });

  const editorPane = args.page.getByTestId("editor-pane");
  await expect(editorPane).toBeVisible({ timeout: timeoutMs });

  await expect
    .poll(
      async () => {
        const documentId = await editorPane.getAttribute("data-document-id");
        return documentId?.trim().length ?? 0;
      },
      { timeout: timeoutMs },
    )
    .toBeGreaterThan(0);

  await expect(args.page.getByTestId("tiptap-editor")).toBeVisible({
    timeout: timeoutMs,
  });
}

/**
 * Create a project from Welcome screen and wait until editor is interactive.
 */
export async function createProjectViaWelcomeAndWaitForEditor(args: {
  page: Page;
  projectName: string;
  clickEditor?: boolean;
  timeoutMs?: number;
}): Promise<void> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_EDITOR_READY_TIMEOUT_MS;
  await waitForProjectIpcReady({ page: args.page, timeoutMs });
  const createEntry = await waitForCreateProjectEntry({
    page: args.page,
    timeoutMs,
  });

  if (createEntry === "welcome") {
    await args.page.getByTestId("welcome-create-project").click();
  } else if (createEntry === "dashboard-empty") {
    await args.page.getByTestId("dashboard-create-first").click();
  } else {
    await args.page.getByTestId("dashboard-create-new").click();
  }

  await expect(args.page.getByTestId("create-project-dialog")).toBeVisible({
    timeout: timeoutMs,
  });
  await args.page.getByTestId("create-project-name").fill(args.projectName);
  await args.page.getByTestId("create-project-submit").click();

  await waitForEditorReady({ page: args.page, timeoutMs });

  if (args.clickEditor) {
    await args.page.getByTestId("tiptap-editor").click();
  }
}

/**
 * Close known modal surfaces to prevent state leakage across tests.
 */
export async function ensureWorkbenchDialogsClosed(args: {
  page: Page;
}): Promise<void> {
  const dialogLocators = [
    args.page.getByTestId("command-palette"),
    args.page.getByTestId("settings-dialog"),
    args.page.getByTestId("export-dialog"),
    args.page.getByTestId("create-project-dialog"),
  ];

  for (let i = 0; i < 6; i += 1) {
    let hasOpenDialog = false;

    for (const dialog of dialogLocators) {
      if (await dialog.isVisible()) {
        hasOpenDialog = true;
        break;
      }
    }

    if (!hasOpenDialog) {
      break;
    }

    await args.page.keyboard.press("Escape");
  }

  for (const dialog of dialogLocators) {
    await expect(dialog).not.toBeVisible();
  }
}
