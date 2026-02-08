# Rulebook Delta: project-management（Issue-301）

## Scope

仅执行并交付 OpenSpec change `project-management-p0-creation-metadata-dashboard`。

## Delivery Subset (PM-1)

- 项目创建：手动创建、AI 辅助 mock、失败降级
- 项目元数据：字段持久化、阶段切换、占位字段保留
- Dashboard：打开项目、空状态、搜索过滤
- 边界：项目容量上限（2,000）、非法枚举、IPC schema 非法请求

## Contract Conventions

- IPC 命名遵循 `<domain>:<resource>:<action>` 三段式
- `project-management` 模块使用 `project:project:*` 命名族
- 所有返回保持 `ok: true|false` envelope；错误包含 `code/message` 与可追踪详情

## Guardrails

- 严格执行 TDD（Red → Green → Refactor）
- Red 证据先于实现
- RUN_LOG 必须记录关键命令与结果
- PR 必须通过 `ci`、`openspec-log-guard`、`merge-serial` 且启用 auto-merge
