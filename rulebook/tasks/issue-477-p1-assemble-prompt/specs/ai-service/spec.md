# AI Service Task Spec — issue-477-p1-assemble-prompt

## Scope

- Deliver and close out `openspec/changes/p1-assemble-prompt` under OpenSpec + Rulebook + GitHub governance.
- Keep system prompt assembly order fixed: identity → rules → skill → mode → memory → context.
- Add boundary hardening: blank `globalIdentity` must not leave empty separator placeholders.
- Keep scope limited to this change and its evidence/archive closure.

## Acceptance

- Scenario mapping for S1/S2/S3/S4 is explicit in `openspec/changes/archive/p1-assemble-prompt/tasks.md`.
- Red evidence exists for blank identity placeholder failure, and Green evidence exists after minimal fix.
- Rulebook task validates successfully.
- Change is archived to `openspec/changes/archive/p1-assemble-prompt`.
- `openspec/changes/EXECUTION_ORDER.md` is synchronized after active-change topology update.
- Delivery closes with PR checks green and merge into control-plane `main`.
