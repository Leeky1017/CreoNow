# Proposal: issue-307-project-management-p1-lifecycle-switch-delete

## Why

`project-management-p1-lifecycle-switch-delete` 当前仅有 PM-2 delta 文档，尚未完成可执行实现与测试闭环。为满足 Project Management 生命周期安全要求，必须补齐项目切换前 autosave flush、删除二次确认、生命周期状态机与异常路径治理能力，并按 OpenSpec + Rulebook + GitHub 门禁完成交付。

## What Changes

- 仅交付 `openspec/changes/project-management-p1-lifecycle-switch-delete` 覆盖范围。
- 新增并落地 PM2-S1~S10 对应测试（Red→Green→Refactor）。
- 在主进程实现 `switch/archive/restore/purge/lifecycle:get` 生命周期能力，状态机采用 transition map + guard。
- 在渲染层实现项目切换加载条（>1s）与删除名称二次确认拦截。
- 更新 IPC contract / generated types / error code，补齐结构化错误返回。
- 记录依赖同步检查、Red/Green 证据、门禁与合并证据到 RUN_LOG。

## Impact

- Affected specs:
  - `openspec/changes/project-management-p1-lifecycle-switch-delete/**`
- Affected code:
  - `apps/desktop/main/src/services/projects/**`
  - `apps/desktop/main/src/ipc/project.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/renderer/src/features/projects/**`
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `apps/desktop/tests/**`（PM-2 对应测试文件）
  - `packages/shared/types/ipc-generated.ts`
- Breaking change: NO（保留既有 `project:project:setcurrent`、`project:project:archive`、`project:project:delete` 调用路径）
- User benefit:
  - 降低跨项目切换丢稿风险
  - 强化删除防误操作能力
  - 形成可恢复、可审计、可回归的生命周期闭环
