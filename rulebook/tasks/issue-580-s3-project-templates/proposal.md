# Proposal: issue-580-s3-project-templates

## Why

Sprint 3 的 `s3-project-templates` 需要把“模板选择”从前端展示能力升级为“创建链路可执行能力”。当前 `CreateProjectDialog` 已有模板 UI，但主进程 `project:create` 未接入模板参数，导致创建产物始终是单默认章节，无法满足模板化初始化场景。

## What Changes

- 新增主进程模板服务：读取内置模板资源、解析模板输入、校验自定义模板 schema。
- 新增内置模板资源目录（小说/短篇/剧本/自定义）并约束字段。
- 扩展 `project:create` IPC 入参与契约：支持可选模板输入，保持响应结构不变。
- 在 renderer 创建流程透传模板选择结果到 `project:create`。
- 为 S1/S2/S3 新增对应测试并完成 Red→Green 证据闭环。

## Scope

- In scope:
  - `apps/desktop/main/src/services/projects/**`
  - `apps/desktop/main/templates/project/**`
  - `apps/desktop/main/src/ipc/**`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`
  - `apps/desktop/renderer/src/stores/projectStore.tsx`
  - `packages/shared/types/ipc-generated.ts`
  - `openspec/changes/s3-project-templates/tasks.md`
  - `openspec/_ops/task_runs/ISSUE-580.md`
- Out of scope:
  - 在线模板市场/云同步/模板版本管理
  - AI 自动生成模板扩展
  - PR 创建与合并（按 Owner 指令禁止）

## Progress Snapshot

- [x] 必读文档完成（Spec-first）
- [x] S1/S2/S3 Red 失败证据完成
- [x] 最小实现转绿
- [x] 受影响 project-management 回归通过
- [x] 交付收口：commit + push + 最终证据回填
