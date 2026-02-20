# 提案：aud-c3a-ipc-session-project-binding

## Why（问题与目标）

IPC handler 若仅依赖 payload 中的字符串 `projectId`，会存在被伪造/串用的风险，导致跨项目访问边界被破坏（审计项：project isolation / authorization）。此外，AI chat 这类“带状态”的 IPC 能力若不按 project 维度隔离，容易出现历史串线与治理漂移。

本 change 的目标是建立 `webContentsId -> projectId` 的会话绑定能力，并提供最小证据证明：

- 会话绑定可读、可覆盖、可清理。
- AI chat 历史在 project 维度隔离（send/list/clear 不互相污染）。
- 启用会话绑定时，mismatched payload 必须被拒绝（为后续 c3b 的全域 guard 打基础）。

## What（交付内容）

- 新增 `createProjectSessionBindingRegistry`，支持 bind/resolve/clear（会话绑定基础设施）。
- AI chat handler 在 project 维度隔离历史数据（按 `projectId` 分区）。
- 启用 session binding 时，支持“按绑定 projectId 隐式补全”并拒绝 mismatched payload。
- 新增回归测试：
  - `apps/desktop/main/src/ipc/__tests__/projectSessionBinding.test.ts`
  - `apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c3a-ipc-session-project-binding/specs/ipc/spec.md`
- Tests（evidence）:
  - `apps/desktop/main/src/ipc/__tests__/projectSessionBinding.test.ts`
  - `apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内覆盖所有 IPC handler 的 project guard（该项在后续 c3b 收敛）。
- 不改变 IPC channel 命名或引入新的权限模型（仅引入会话绑定与最小隔离约束）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
