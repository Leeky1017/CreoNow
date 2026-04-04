export type ContextPromptInputType = "selection" | "document";

/**
 * Continue/document-window skills must preserve raw leading/trailing whitespace so
 * the prompt window stays byte-for-byte aligned with the writeback anchor.
 */
export function normalizeAssembledContextPrompt(args: {
  prompt: string;
  inputType?: ContextPromptInputType;
}): string | undefined {
  if (args.inputType === "document") {
    return args.prompt.length > 0 ? args.prompt : undefined;
  }

  const trimmedPrompt = args.prompt.trim();
  return trimmedPrompt.length > 0 ? trimmedPrompt : undefined;
}

/**
 * Continue output validation must use the same raw context window that was sent
 * to the model; trimming here would reintroduce prompt/anchor drift.
 */
export function resolveContinueValidationInput(args: {
  rawInputText: string;
  rawContextText?: string;
  contextPrompt?: string;
}): string {
  if ((args.rawContextText ?? "").length > 0) {
    return args.rawContextText as string;
  }

  if ((args.contextPrompt ?? "").length > 0) {
    return args.contextPrompt as string;
  }

  return args.rawInputText;
}
