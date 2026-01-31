import { contextBridge, ipcRenderer } from "electron";

type CreonowApi = {
  invoke: (channel: string, payload: unknown) => Promise<unknown>;
};

type CnE2EApi = {
  ready: boolean;
};

const creonow: CreonowApi = {
  invoke: async (channel, payload) => ipcRenderer.invoke(channel, payload),
};

const isE2E = process.env.CREONOW_E2E === "1";
const __CN_E2E__: CnE2EApi = { ready: isE2E };

contextBridge.exposeInMainWorld("creonow", creonow);
contextBridge.exposeInMainWorld("__CN_E2E__", __CN_E2E__);
