# AI Service Task Spec — issue-468-p1-identity-template

## Scope

- Deliver and close out `openspec/changes/p1-identity-template` under OpenSpec + Rulebook + GitHub governance.
- Ensure `GLOBAL_IDENTITY_PROMPT` contract remains valid with five XML blocks:
  - `<identity>`
  - `<writing_awareness>`
  - `<role_fluidity>`
  - `<behavior>`
  - `<context_awareness>`
- Keep scope limited to identity-template change and its evidence closure.

## Acceptance

- Scenario mapping for S1/S2/S3 is explicit in `openspec/changes/archive/p1-identity-template/tasks.md`.
- Red evidence exists (failing assertion for missing writing-awareness term) and Green evidence exists (target tests pass).
- Rulebook task validates successfully.
- Change is archived to `openspec/changes/archive/p1-identity-template`.
- `openspec/changes/EXECUTION_ORDER.md` is synchronized after active-change topology update.
- Delivery closes with PR checks green and merge into control-plane `main`.
