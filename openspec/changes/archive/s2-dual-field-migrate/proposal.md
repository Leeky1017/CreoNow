# 提案：s2-dual-field-migrate

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-dual-field-migrate` 定义为 Sprint 2 债务修复项（A2-M-002 + A2-M-003）。当前 IPC 负载仍可能出现新旧字段并存（`executionId/runId`、`id/skillId`），若无明确弃用策略会造成契约漂移与日志不可追踪。

## 变更内容

- 定义双字段迁移期策略：兼容旧字段输入，但将其标记为弃用并输出结构化 warning。
- 明确新字段优先读取规则，避免运行时歧义。
- 在共享类型中显式标注旧字段 deprecated，推动调用方渐进迁移。

## 受影响模块

- IPC（Main）— `apps/desktop/main/src/ipc/ai.ts`、`apps/desktop/main/src/ipc/skills.ts`
- Shared IPC Types — `packages/shared/types/`（字段弃用标注）

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：与其他 IPC 契约迭代可并行，边界限于双字段迁移。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-dual-field-migrate` 条目；
  - `openspec/specs/ipc/spec.md` 的 schema-first 与兼容性约束。
- 核对项：
  - 新旧字段兼容与弃用日志策略可验证；
  - 新字段优先规则清晰；
  - 不引入通道命名或模式变更。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 迁移期必须“可兼容 + 可观测”；仅兼容不告警会延长债务存活周期。

## 防治标签

- `ADDONLY` `FAKETEST`

## 不做什么

- 不删除旧字段的兼容读取能力（本变更阶段仅弃用提示）。
- 不新增 IPC 通道。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`
