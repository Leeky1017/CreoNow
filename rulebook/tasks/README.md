# Rulebook Tasks

更新时间：2026-02-21 11:57

## 定位

`rulebook/tasks/**` 用于记录任务拆解、执行步骤与证据，属于“怎么做”的治理侧产物，不是系统行为的事实源。

系统行为与约束的事实源（SSOT）：

- `AGENTS.md`
- `docs/delivery-skill.md`
- `openspec/project.md`
- `openspec/specs/<module>/spec.md`
- `.github/workflows/*`

## 历史兼容说明

部分早期 Rulebook task 文档可能引用历史 OpenSpec 路径（如 `openspec/specs/creonow-*`）。这些路径在 OpenSpec 重构后可能已不存在。

当出现路径不一致时，以当前代码与 OpenSpec 主规范为准，并在新任务中使用现行路径与模块索引。

## 归档

- `rulebook/tasks/archive/**` 为历史归档，默认不可篡改
- 当前任务允许在同一 PR 中将自身 task 从 `active` 归档到 `archive`，但禁止递归创建 closeout issue
