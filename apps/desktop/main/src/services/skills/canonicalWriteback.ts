import {
  applySuggestionToSelection,
  type SelectionWritebackResult,
} from "./selectionWriteback";
import {
  appendSuggestionToDocument,
  type DocumentWritebackResult,
} from "./documentWriteback";

export type CanonicalWritebackResult =
  | SelectionWritebackResult
  | DocumentWritebackResult;

export function applyCanonicalSkillWriteback(args: {
  contentJson: unknown;
  suggestion: string;
  selection?: {
    from: number;
    to: number;
    text: string;
    selectionTextHash: string;
  };
  cursorPosition?: number;
}): CanonicalWritebackResult {
  if (args.selection) {
    return applySuggestionToSelection({
      contentJson: args.contentJson,
      selection: args.selection,
      suggestion: args.suggestion,
    });
  }

  return appendSuggestionToDocument({
    contentJson: args.contentJson,
    cursorPosition: args.cursorPosition,
    suggestion: args.suggestion,
  });
}