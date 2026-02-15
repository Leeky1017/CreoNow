# 提案：s3-project-templates

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 3 将 `s3-project-templates`（AR-C36）定义为“项目模板系统（小说/短篇/剧本/自定义）”。当前新建项目流程缺少标准模板注入，用户需手动重复初始化结构，启动成本高且一致性差。

## 变更内容

- 新增模板服务，提供内置模板读取与应用能力。
- 增加模板资源目录（小说/短篇/剧本/自定义）并约束 schema。
- 在项目创建流程中接入模板选择与应用，确保创建后结构可直接使用。

## 受影响模块

- Project Management（`apps/desktop/main/src/services/projects/templateService.ts`）— 模板加载与应用。
- Project Management（`apps/desktop/main/templates/`）— 内置模板资源。
- Project Management（`apps/desktop/renderer/src/features/projects/`）— 新建项目模板选择 UI。

## 依赖关系

- 上游依赖：无（Sprint 3 依赖图中标记独立项）。
- 并行关系：可与 `s3-zen-mode` 并行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-project-templates` 定义与模板清单；
  - `openspec/specs/project-management/spec.md` 中项目创建契约。
- 核对项：
  - 模板应用必须是项目创建路径增强，不破坏既有 `project:create` 契约；
  - 内置模板 schema 与创建链路字段映射明确；
  - 仅实现路线图声明的四类模板，不扩展模板市场等能力。
- 结论：`NO_DRIFT`（与 AR-C36 一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 模板 schema 若随意扩展字段，会导致创建链路出现隐性兼容问题。
- 过度抽象模板装配流程会形成多层转发，降低可维护性。
- 创建成功必须验证模板内容已真实落盘，避免“空项目假成功”。

## 代码问题审计重点

- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 测试要验证“选模板创建后产物结构正确”，而不只是 IPC 返回成功。
- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：
  - 模板 schema 命名与项目元数据字段保持既有约定，避免平行命名体系。
- 来自 `docs/代码问题/辅助函数滥用与过度抽象.md`：
  - 禁止为单次调用路径引入多层 helper 链，模板应用流程保持可直读与可追踪。

## 防治标签

`FAKETEST` `DRIFT` `OVERABS`

## 不做什么

- 不新增在线模板市场、云端模板同步或模板版本管理。
- 不改造项目 Dashboard 信息架构。
- 不在本 change 内扩展 AI 自动生成模板能力。

## 审阅状态

- Owner 审阅：`PENDING`
