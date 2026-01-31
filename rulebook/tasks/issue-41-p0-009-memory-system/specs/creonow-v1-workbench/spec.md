# Delta Spec: Memory system (ISSUE-41)

## Requirements

- Implement `CNWB-REQ-070` memory system: CRUD + settings + injection preview + preference learning.
- IPC must use the standard envelope `{ ok: true|false }` with stable error codes.
- Injection preview must deterministically sort items, and degrade to deterministic mode when semantic recall is unavailable.
- `ai:skill:feedback` must persist signals and trigger preference learning; noise signals must be ignored and observable.

## Scenarios

- WHEN `injectionEnabled=false` THEN injected items MUST be empty AND injection placeholder MUST remain present and stable.
- WHEN `queryText` is present but semantic recall is unavailable THEN preview MUST return `mode=deterministic` with diagnostics.
- WHEN feedback `{ action: accept, evidenceRef }` reaches threshold THEN a learned preference memory MUST be created/updated.
