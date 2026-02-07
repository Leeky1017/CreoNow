# Proposal: issue-252-openspec-change-archive-hard-gate

## Why

当前 `openspec/changes/` 下存在已完成且已合并的 change 仍停留在活跃目录，导致执行面与事实状态不一致，也容易让后续任务误判依赖关系。需要把“完成后必须归档”升级为可执行门禁，避免再次返工。

## What Changes

- 归档已完成的 IPC P0 change 到 `openspec/changes/archive/`。
- 在 `scripts/agent_pr_preflight.py` 增加硬校验：活跃 change 若 `tasks.md` 全勾选完成则必须已归档。
- 在 `.github/workflows/openspec-log-guard.yml` 增加同等校验，形成 CI 必过门禁。
- 更新 `docs/delivery-skill.md` 与 `scripts/README.md`，固化规则与脚本行为。

## Impact

- Affected specs:
  - `docs/delivery-skill.md`
- Affected code:
  - `scripts/agent_pr_preflight.py`
  - `.github/workflows/openspec-log-guard.yml`
  - `scripts/README.md`
  - `openspec/changes/archive/**`
- Breaking change: NO
- User benefit: 已完成变更不会长期滞留在活跃区，流程状态更可信，CI/preflight 会自动阻断未归档漂移。
