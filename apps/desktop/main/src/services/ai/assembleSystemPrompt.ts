/**
 * Assemble a layered system prompt from identity + optional overlays.
 *
 * Layer order (highest constraint power first):
 * 1. globalIdentity — always present, defines AI identity and writing awareness
 * 2. userRules — user-defined rules (global + project level)
 * 3. skillSystemPrompt — skill-specific system prompt from SKILL.md
 * 4. modeHint — mode-specific hint (agent/plan/ask)
 * 5. memoryOverlay — user preferences and writing style from memory system
 * 6. contextOverlay — dynamic context (KG rules, project constraints)
 *
 * Design reference: audit/01 §3.2 — Cursor/Manus best practice ordering.
 */
export function assembleSystemPrompt(args: {
  globalIdentity: string;
  userRules?: string;
  skillSystemPrompt?: string;
  modeHint?: string;
  memoryOverlay?: string;
  contextOverlay?: string;
}): string {
  const parts: string[] = [args.globalIdentity];

  if (args.userRules?.trim()) {
    parts.push(args.userRules);
  }
  if (args.skillSystemPrompt?.trim()) {
    parts.push(args.skillSystemPrompt);
  }
  if (args.modeHint?.trim()) {
    parts.push(args.modeHint);
  }
  if (args.memoryOverlay?.trim()) {
    parts.push(args.memoryOverlay);
  }
  if (args.contextOverlay?.trim()) {
    parts.push(args.contextOverlay);
  }

  return parts.join("\n\n");
}
