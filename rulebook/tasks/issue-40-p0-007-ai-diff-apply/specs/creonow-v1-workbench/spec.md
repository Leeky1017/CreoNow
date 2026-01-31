# CN Workbench P0-007 — AI diff + apply selection + actor=ai versioning

## Delta Requirements

- When an AI run completes with replacement text for the current editor selection, the UI MUST render a deterministic unified diff (old selection vs new text).
- Apply MUST:
  - verify selection conflict via `selectionRef` (selection range + selection text hash),
  - replace the original selection range via a TipTap transaction,
  - persist SSOT and create a new document version with `actor=ai` and `reason=ai-apply:<runId>`,
  - be observable in `main.log` as `ai_apply_started` and `ai_apply_succeeded`.
- If conflict detection fails, Apply MUST return `CONFLICT`, MUST NOT modify SSOT, MUST NOT create an `actor=ai` version, and MUST emit `ai_apply_conflict` evidence in `main.log`.
- Reject MUST clear the diff proposal without modifying the document.

## Scenarios

### Success path
1. User selects non-empty text in editor.
2. AI run completes with deterministic replacement text.
3. Diff view is visible.
4. User clicks Apply.
5. Editor content updates and a new version appears (`actor=ai`, `reason=ai-apply:<runId>`).

### Conflict path
1. User generates a diff for a selection.
2. User edits the selection content before applying.
3. User clicks Apply.
4. UI shows `CONFLICT`, document content is not overwritten, and no `actor=ai` version is created.

