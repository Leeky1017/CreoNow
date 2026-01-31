import { contextBridge } from "electron";

import { creonowInvoke } from "./ipc";
import { registerAiStreamBridge } from "./aiStreamBridge";

registerAiStreamBridge();

contextBridge.exposeInMainWorld("creonow", {
  invoke: creonowInvoke,
});
