import type { DocumentStatus } from "../../stores/editorStore";

export type FinalDocumentEditDecision = {
  allowEditing: boolean;
  nextStatus: DocumentStatus;
};

/**
 * Decide whether editing can continue when document is currently final.
 *
 * Why: final documents require an explicit user decision before returning to draft mode.
 */
export function resolveFinalDocumentEditDecision(args: {
  status: DocumentStatus;
  confirmed: boolean;
}): FinalDocumentEditDecision {
  if (args.status !== "final") {
    return { allowEditing: true, nextStatus: args.status };
  }

  if (!args.confirmed) {
    return { allowEditing: false, nextStatus: "final" };
  }

  return { allowEditing: true, nextStatus: "draft" };
}
