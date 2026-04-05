import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";
import { registerAiStreamBridge } from "./aiStreamBridge";
import { registerExportProgressBridge } from "./exportProgressBridge";

function isE2EEnabled(): boolean {
  if (typeof window.location?.href === "string") {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("creonow_e2e") === "1") {
        return true;
      }
    } catch {
      // Ignore URL parse errors and fallback to env probing.
    }
  }

  const maybeProcess = (
    globalThis as {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process;

  return maybeProcess?.env?.CREONOW_E2E === "1";
}

const aiStreamBridge = registerAiStreamBridge();
const exportProgressBridge = registerExportProgressBridge();
window.addEventListener("beforeunload", () => {
  aiStreamBridge.dispose();
  exportProgressBridge.dispose();
});

const api = {
  project: {
    create: (payload: Parameters<typeof creonowInvoke<"project:project:create">>[1]) =>
      creonowInvoke("project:project:create", payload),
    getCurrent: () => creonowInvoke("project:project:getcurrent", {}),
    list: (payload: Parameters<typeof creonowInvoke<"project:project:list">>[1]) =>
      creonowInvoke("project:project:list", payload),
    setCurrent: (payload: Parameters<typeof creonowInvoke<"project:project:setcurrent">>[1]) =>
      creonowInvoke("project:project:setcurrent", payload),
  },
  file: {
    createDocument: (payload: Parameters<typeof creonowInvoke<"file:document:create">>[1]) =>
      creonowInvoke("file:document:create", payload),
    getCurrentDocument: (payload: Parameters<typeof creonowInvoke<"file:document:getcurrent">>[1]) =>
      creonowInvoke("file:document:getcurrent", payload),
    listDocuments: (payload: Parameters<typeof creonowInvoke<"file:document:list">>[1]) =>
      creonowInvoke("file:document:list", payload),
    readDocument: (payload: Parameters<typeof creonowInvoke<"file:document:read">>[1]) =>
      creonowInvoke("file:document:read", payload),
    saveDocument: (payload: Parameters<typeof creonowInvoke<"file:document:save">>[1]) =>
      creonowInvoke("file:document:save", payload),
    setCurrentDocument: (payload: Parameters<typeof creonowInvoke<"file:document:setcurrent">>[1]) =>
      creonowInvoke("file:document:setcurrent", payload),
  },
  ai: {
    confirmSkill: (payload: Parameters<typeof creonowInvoke<"ai:skill:confirm">>[1]) =>
      creonowInvoke("ai:skill:confirm", payload),
    cancelSkill: (payload: Parameters<typeof creonowInvoke<"ai:skill:cancel">>[1]) =>
      creonowInvoke("ai:skill:cancel", payload),
    runSkill: (payload: Parameters<typeof creonowInvoke<"ai:skill:run">>[1]) =>
      creonowInvoke("ai:skill:run", payload),
    submitSkillFeedback: (payload: Parameters<typeof creonowInvoke<"ai:skill:feedback">>[1]) =>
      creonowInvoke("ai:skill:feedback", payload),
  },
  version: {
    listSnapshots: (payload: Parameters<typeof creonowInvoke<"version:snapshot:list">>[1]) =>
      creonowInvoke("version:snapshot:list", payload),
    readSnapshot: (payload: Parameters<typeof creonowInvoke<"version:snapshot:read">>[1]) =>
      creonowInvoke("version:snapshot:read", payload),
    rollbackSnapshot: (payload: Parameters<typeof creonowInvoke<"version:snapshot:rollback">>[1]) =>
      creonowInvoke("version:snapshot:rollback", payload),
    restoreSnapshot: (payload: Parameters<typeof creonowInvoke<"version:snapshot:restore">>[1]) =>
      creonowInvoke("version:snapshot:restore", payload),
  },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("creonow", {
  api,
  invoke: creonowInvoke,
  stream: {
    registerAiStreamConsumer: aiStreamBridge.registerAiStreamConsumer,
    releaseAiStreamConsumer: aiStreamBridge.releaseAiStreamConsumer,
    registerExportProgressConsumer:
      exportProgressBridge.registerExportProgressConsumer,
    releaseExportProgressConsumer:
      exportProgressBridge.releaseExportProgressConsumer,
  },
});

contextBridge.exposeInMainWorld("__CN_E2E_ENABLED__", isE2EEnabled());
