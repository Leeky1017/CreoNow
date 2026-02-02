# Spec Delta: P0-015 Documents + FileTree minimal

## Scope

This task implements the minimal “documents within a single project” loop:

- Create / list / read / write (existing)
- Rename / delete
- `currentDocumentId` persisted per project and restored on restart
- Stable `data-testid` hooks for Windows Playwright E2E

## IPC Contract (additions)

Channels:

- `file:document:rename({ projectId, documentId, title }) -> { updated: true }`
- `file:document:setCurrent({ projectId, documentId }) -> { documentId }`
- `file:document:getCurrent({ projectId }) -> { documentId }`

Error codes (deterministic):

- `INVALID_ARGUMENT`: missing/blank ids; invalid title (empty or too long)
- `NOT_FOUND`: document not found under the given project; no current document
- `DB_ERROR`: database operation failed

## Persistence semantics

- `currentDocumentId` MUST be scoped to the project (no cross-project leakage).
- Storage MUST use the existing `settings` table:
  - `scope = "project:<projectId>"`
  - `key = "creonow.document.currentId"`
  - `value_json = JSON.stringify(documentId)`

## Delete semantics (V1 deterministic)

When deleting the current document:

- If there exists another document under the same project, the app MUST select
  the most recently updated remaining document as the new current document.
- If no documents remain, the app MUST clear the current document setting and
  `getCurrent` MUST return `NOT_FOUND`.

## Observability

Main process MUST log:

- `document_created` (projectId, documentId)
- `document_renamed` (documentId)
- `document_deleted` (documentId)
- `document_set_current` (projectId, documentId)
