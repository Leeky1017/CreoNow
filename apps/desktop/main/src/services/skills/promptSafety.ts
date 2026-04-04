export function escapePromptTagContent(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderSelectionPromptInput(args: {
  selectedText: string;
  userInstruction?: string;
}): string {
  const userInstruction = args.userInstruction?.trim();
  if (!userInstruction) {
    return args.selectedText;
  }

  return [
    "Selected text:",
    args.selectedText,
    "",
    "User instruction:",
    userInstruction,
  ].join("\n");
}

export function renderSafePromptTemplate(args: {
  template: string;
  input: string;
}): string {
  const safeInput = escapePromptTagContent(args.input);
  if (args.template.includes("{{input}}")) {
    return args.template.split("{{input}}").join(safeInput);
  }
  if (args.template.trim().length === 0) {
    return safeInput;
  }
  return `${args.template}\n\n${safeInput}`;
}
