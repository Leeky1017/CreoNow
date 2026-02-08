# Proposal: issue-301-project-management-p0-creation-metadata-dashboard

## Why

`project-management-p0-creation-metadata-dashboard` 已完成 Owner 审批，需要从 OpenSpec change 落地到可执行代码与测试证据。当前实现缺少 PM-1 所要求的项目元数据、AI 辅助创建 mock、容量阈值与结构化错误码，且 Dashboard/创建对话框尚未覆盖 PM-1 的完整可验收行为。

## What Changes

- 实现 PM-1 的后端能力：
  - 项目创建（手动 + 默认章节）
  - AI 辅助创建 mock（生成草案 + 失败降级）
  - 元数据更新与阶段切换
  - 项目容量阈值（2,000）与非法枚举拒绝
- 实现 PM-1 的 IPC 契约扩展：
  - `project:project:createaiassist`
  - `project:project:update`
  - `project:project:stats`
- 补齐前端行为与 Storybook 覆盖：
  - 创建对话框 4 态
  - Dashboard 3 态
- 以 TDD 方式完成 PM1-S1~S11 的测试映射与 Red/Green 证据。

## Impact

- Affected specs:
  - `openspec/changes/project-management-p0-creation-metadata-dashboard/**`
  - `rulebook/tasks/issue-301-project-management-p0-creation-metadata-dashboard/**`
- Affected code:
  - `apps/desktop/main/src/services/projects/**`
  - `apps/desktop/main/src/ipc/project.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/renderer/src/features/projects/**`
  - `apps/desktop/renderer/src/features/dashboard/**`
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `apps/desktop/tests/**`
- Breaking change: NO
- User benefit: PM-1 三项能力（创建、元数据、Dashboard）可测可用，并具备结构化错误与门禁证据链。
