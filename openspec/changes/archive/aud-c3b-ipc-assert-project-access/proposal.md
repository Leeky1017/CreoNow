# 提案：aud-c3b-ipc-assert-project-access

## Why（问题与目标）

仅依赖 payload 中的 `projectId` 会带来跨项目越权访问风险：renderer 可伪造 `projectId` 访问不属于当前会话的 context/memory/knowledge 数据。该风险属于审计高优先级项（project isolation / authorization）。

本 change 的目标是将关键 IPC handler 统一接入 project access guard：当启用 `projectSessionBinding` 时，任何与绑定 projectId 不一致的访问必须被拒绝并返回 `FORBIDDEN`。

## What（交付内容）

- 为关键 IPC handlers（至少覆盖 contextFs/memory/knowledge）接入统一 `assertProjectAccess` 守卫。
- 当 session-bound projectId 与 payload projectId 不一致时，必须返回 `{ ok: false, error: { code: "FORBIDDEN" } }`。
- 新增回归测试：`apps/desktop/main/src/ipc/__tests__/project-access-guard.test.ts`
  - 覆盖 Scenario `IPC-AUD-C3B-S1`。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c3b-ipc-assert-project-access/specs/ipc/spec.md`
- Tests（evidence）:
  - `apps/desktop/main/src/ipc/__tests__/project-access-guard.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内引入新的权限模型（仅使用 session binding 做一致性校验）。
- 不在本 change 内重构所有 IPC handler 的参数形态（仅接线守卫并锁定最小集合）。

## Evidence（可追溯证据）

- Wave1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-591.md`
- Wave1 PR：https://github.com/Leeky1017/CreoNow/pull/592

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
