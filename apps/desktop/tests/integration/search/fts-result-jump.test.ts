import assert from "node:assert/strict";

import type { IpcResponse } from "../../../../../packages/shared/types/ipc-generated";
import { navigateSearchResult } from "../../../renderer/src/features/search/SearchPanel";

{
  const setCurrentCalls: Array<{ projectId: string; documentId: string }> = [];
  const flashKeys: Array<string | null> = [];
  let closed = false;

  await navigateSearchResult({
    projectId: "proj_1",
    result: {
      documentId: "doc_3",
      anchor: { start: 12, end: 18 },
    },
    setCurrent: async ({ projectId, documentId }) => {
      setCurrentCalls.push({ projectId, documentId });
      return {
        ok: true,
        data: { documentId },
      } as IpcResponse<{ documentId: string }>;
    },
    setFlashKey: (value) => {
      flashKeys.push(value);
    },
    onClose: () => {
      closed = true;
    },
    setTimeoutFn: (cb) => {
      cb();
      return 0;
    },
  });

  assert.deepEqual(setCurrentCalls, [
    {
      projectId: "proj_1",
      documentId: "doc_3",
    },
  ]);
  assert.equal(flashKeys[0]?.startsWith("doc_3:12:18:"), true);
  assert.equal(flashKeys.at(-1), null);
  assert.equal(closed, true);
}
