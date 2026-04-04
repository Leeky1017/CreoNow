/**
 * Diff IPC handlers — 文本差异计算
 */

import { computeTransaction } from "../services/diff/DiffEngine";
import type { ProseMirrorTransactionSpec } from "../services/diff/types";

export interface DiffHandlers {
  "version:diff:transaction": {
    request: { before: string; after: string };
    response: ProseMirrorTransactionSpec;
  };
}

export function createDiffHandlers() {
  return {
    "version:diff:transaction": (args: {
      before: string;
      after: string;
    }): ProseMirrorTransactionSpec => {
      return computeTransaction(args.before, args.after);
    },
  };
}
