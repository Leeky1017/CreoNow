# 提案：project-management-p0-creation-metadata-dashboard

## 背景

`project-management` 主规范覆盖创建、元数据、Dashboard、多项目切换、删除与生命周期闭环。直接并行推进全部 requirement 会放大风险并拖慢反馈周期。

本 change 先落地 P0 数据基础能力：创建、元数据与 Dashboard，并将 IPC 命名、请求/响应 schema、Zod 运行时校验收敛为统一契约，为后续 PM-2 的切换/删除/生命周期能力提供稳定底座。

## 变更内容

- 仅覆盖 PM 主 spec 中 3 个 requirement：
  - 项目创建（手动创建、AI 辅助创建、失败降级）
  - 项目元数据（元数据编辑、创作阶段切换）
  - Dashboard（打开项目、空状态、搜索过滤）
- 明确 P0 项目数据模型与 IPC 通道命名约束：
  - `project:project:create`
  - `project:project:createaiassist`
  - `project:project:update`
  - `project:project:list`
  - `project:project:stats`
- 为上述通道定义请求/响应 Zod schema 契约，并约束返回可判定结果（`ok: true | false`）。
- 明确 AI 辅助创建在本阶段依赖 `ai-service` mock，不调用真实 LLM 配额。
- 明确 `knowledgeGraphId`、`defaultSkillSetId` 在本阶段仅为占位字段，不接通真实 KG/Skill 服务。
- 定义 Storybook 覆盖面：
  - 创建对话框：4 态（手动创建、AI 辅助、AI 生成中、生成结果预览）
  - Dashboard：3 态（默认多项目、搜索过滤、空状态）
- 纳入跨切边界场景：容量溢出（>2,000 项目）、非法枚举值。

## 受影响模块

- `openspec/changes/project-management-p0-creation-metadata-dashboard/**`
- `apps/desktop/main/src/services/projects/**`
- `apps/desktop/main/src/ipc/project.ts`
- `apps/desktop/main/src/ipc/stats.ts`
- `apps/desktop/renderer/src/features/projects/**`
- `apps/desktop/renderer/src/features/dashboard/**`
- `apps/desktop/renderer/src/stores/projectStore.tsx`
- `packages/shared/**`（IPC 类型与 schema 共享定义）

## 不做什么

- 不实现多项目切换上下文联动逻辑（KG/MS 真正切换在 PM-2 预留接口阶段处理）。
- 不实现项目删除确认流程与归档/恢复状态机。
- 不做 NFR 性能压测，仅建立阈值可验证基线与可测契约。
- 不修改主 spec：`openspec/specs/project-management/spec.md`。

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-08）
