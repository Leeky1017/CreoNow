# Rulebook Spec Notes: issue-328-cross-module-contract-alignment-gate

## Scope

- 新增 cross-module 契约自动门禁能力。
- 门禁覆盖本地 preflight 与 CI。
- 漂移必须显式登记，未登记漂移直接失败。

## Verification

- `rulebook task validate` 通过。
- `pnpm cross-module:check` 通过。
- `scripts/agent_pr_preflight.sh` 通过并包含 cross-module 校验。
