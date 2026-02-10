# 提案：context-engine-p3-constraints-rules-injection

## 背景

当前 Constraints 能力在主 spec 中已有高层定义，但 CRUD 契约、优先级注入规则与膨胀裁剪细则尚不够可执行。
需要在 CE-2 预算基础上固化约束管理闭环，避免用户显式约束在多来源合并时被弱化。

## 变更内容

- 固化 `constraints:policy:list/create/update/delete` 契约与错误码（遵循 `<domain>:<resource>:<action>` 命名治理）。
- 固化 Rules 注入格式与优先级规则：用户显式 > KG 自动。
- 固化约束过多导致 Rules 膨胀时的裁剪策略与日志要求。

## 受影响模块

- Context Engine delta：`openspec/changes/context-engine-p3-constraints-rules-injection/specs/context-engine-delta.md`
- Constraints IPC（后续实现阶段）：`packages/shared/types/ipc/constraints.ts`
- Context Engine（后续实现阶段）：`apps/desktop/main/src/services/context/`
- Knowledge Graph 供给侧（后续实现阶段）：`apps/desktop/main/src/services/kg/`

## 依赖关系

- 上游依赖：`context-engine-p1-token-budget-truncation`
- 下游依赖：`context-engine-p4-hardening-boundary`

## Dependency Sync Check

- 核对输入：
  - `openspec/changes/context-engine-p1-token-budget-truncation/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/knowledge-graph/spec.md`
  - `openspec/specs/ipc/spec.md`
- 核对项：数据结构、IPC 契约、错误码、阈值。
- 结论：`NO_DRIFT`（并补充对齐 IPC 三段式命名治理：`constraints:policy:*`）。

## Out-of-scope

- Judge 判定算法本体。
- Stable Prefix Hash 细节。
- 跨项目权限模型强化（在 CE-5 统一硬化）。

## 审阅状态

- Owner 审阅：`PENDING`
