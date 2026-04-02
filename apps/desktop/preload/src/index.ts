import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";
import { registerAiStreamBridge } from "./aiStreamBridge";

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
window.addEventListener("beforeunload", () => {
  aiStreamBridge.dispose();
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
    runSkill: (payload: Parameters<typeof creonowInvoke<"ai:skill:run">>[1]) =>
      creonowInvoke("ai:skill:run", payload),
    submitSkillFeedback: (payload: Parameters<typeof creonowInvoke<"ai:skill:feedback">>[1]) =>
      creonowInvoke("ai:skill:feedback", payload),
  },
  version: {
    listSnapshots: (payload: Parameters<typeof creonowInvoke<"version:snapshot:list">>[1]) =>
      creonowInvoke("version:snapshot:list", payload),
  },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("creonow", {
  api,
  invoke: creonowInvoke,
  stream: {
    registerAiStreamConsumer: aiStreamBridge.registerAiStreamConsumer,
    releaseAiStreamConsumer: aiStreamBridge.releaseAiStreamConsumer,
  },
});

contextBridge.exposeInMainWorld("__CN_E2E_ENABLED__", isE2EEnabled());
