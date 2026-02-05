# Spec Delta: P0-012 SystemDialog/Confirm unification

## Scope

This task integrates `Features/AiDialogs` into real app surfaces and removes native confirms:

- Files: delete document confirmation uses `SystemDialog`
- Knowledge Graph: delete entity / relation confirmation uses `SystemDialog`
- Dashboard: delete project confirmation uses `SystemDialog` + `project:delete`
- AI Panel: error UI uses `AiErrorCard` with stable selectors

## Confirmation semantics (renderer)

- Destructive confirms MUST NOT use `window.confirm`.
- The renderer MUST render `SystemDialog` as a real surface (Radix Dialog).
- Confirm API is promise-based: `confirm(options) -> Promise<boolean>`.
- Concurrency strategy MUST be deterministic:
  - If `confirm()` is called while another confirmation is still open, the previous
    confirmation is canceled (resolves to `false`) and replaced by the new one.

## UX + Accessibility

- Dialog MUST close via `Esc` / overlay click (Radix default).
- Focus SHOULD move into the dialog on open and return to the trigger on close.
- Production path MUST NOT simulate latency by default:
  - `SystemDialog.simulateDelay` default is `0`.

## Testing hooks (stable selectors)

- Files:
  - `file-delete-<documentId>` opens SystemDialog for delete
- Knowledge Graph:
  - `kg-entity-delete-<entityId>` opens SystemDialog for delete
  - `kg-relation-delete-<relationId>` opens SystemDialog for delete
- AI:
  - Error code MUST remain `data-testid="ai-error-code"` (Playwright E2E contract)

## E2E coverage

- `apps/desktop/tests/e2e/system-dialog.spec.ts` covers:
  - FileTreePanel: Cancel keeps doc, Confirm deletes doc
  - KnowledgeGraphPanel: Cancel keeps entity, Confirm deletes entity
- Existing tests updated to click SystemDialog buttons:
  - `apps/desktop/tests/e2e/documents-filetree.spec.ts`
  - `apps/desktop/tests/e2e/knowledge-graph.spec.ts`
