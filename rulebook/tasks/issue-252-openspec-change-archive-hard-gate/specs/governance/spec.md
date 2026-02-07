# Spec Delta: governance (ISSUE-252)

本任务用于把“完成 change 归档”从约定升级为硬门禁。

## Changes

- Add: 已完成 change（`tasks.md` 全勾选）不得继续停留在 `openspec/changes/` 活跃目录。
- Add: 本地 preflight 与 CI `openspec-log-guard` 同步校验上述规则。
- Apply: 将已完成 IPC P0 change 归档到 `openspec/changes/archive/`。

## Acceptance

- `openspec/changes/` 活跃目录不再包含已完成 IPC P0 change。
- `scripts/agent_pr_preflight.py` 与 `openspec-log-guard` 对“完成未归档”均能阻断。
