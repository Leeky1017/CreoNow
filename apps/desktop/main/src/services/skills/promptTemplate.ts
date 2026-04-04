const XML_ENTITY_REPLACEMENTS: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
};

export function escapeStructuredPromptValue(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ENTITY_REPLACEMENTS[char] ?? char);
}

export function renderPromptTemplate(args: {
  template: string;
  values: Record<string, string>;
}): string {
  const usedPlaceholder = Object.keys(args.values).some((key) =>
    args.template.includes(`{{${key}}}`),
  );
  const escapedValues = Object.fromEntries(
    Object.entries(args.values).map(([key, value]) => [key, escapeStructuredPromptValue(value)]),
  );
  let rendered = args.template;
  for (const [key, value] of Object.entries(escapedValues)) {
    rendered = rendered.split(`{{${key}}}`).join(value);
  }

  if (args.template.trim().length === 0) {
    return escapedValues.input ?? "";
  }

  if (usedPlaceholder) {
    return rendered;
  }

  return `${rendered}\n\n${escapedValues.input ?? ""}`;
}
