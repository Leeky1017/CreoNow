import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";

contextBridge.exposeInMainWorld("creonow", {
  invoke: creonowInvoke,
});
