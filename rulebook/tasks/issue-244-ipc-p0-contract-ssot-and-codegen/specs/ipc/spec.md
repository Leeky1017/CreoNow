# Spec Delta: ipc (ISSUE-244)

本任务对应 OpenSpec change `ipc-p0-contract-ssot-and-codegen`，目标是在现有 IPC SSOT 与 codegen 基线上补齐“可阻断违规”的校验能力与可追踪测试证据。

## Changes

- Add: `contract-generate` 稳定错误码校验（命名、缺失 schema、重复通道、无效 schema 引用、未注册绑定）。
- Add: 主进程 `ipcMain.handle/on` 与契约注册表的一致性校验，阻断绕过契约的直接绑定。
- Add: 单元测试覆盖 Scenario 映射与 Red/Green 证据链。
- Keep: `pnpm contract:check` 作为生成后无差异的 CI 漂移门禁。

## Acceptance

- 缺失 schema / 重复通道 / 非法命名 / 无效 schema 引用 / 未注册绑定均返回稳定错误码并非零退出。
- `pnpm contract:generate` 在契约未变化时重复执行无 diff。
- `scripts/agent_pr_preflight.sh` 通过并落盘到 `openspec/_ops/task_runs/ISSUE-244.md`。
