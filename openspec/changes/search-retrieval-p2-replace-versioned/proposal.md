# 提案：search-retrieval-p2-replace-versioned

## 背景

SR-3 负责在搜索体系中补齐可回滚的替换能力。
若不在该阶段固化 `search:replace:preview/execute` 契约、确认流程与全项目替换前版本快照策略，将导致大范围替换不可追溯，且与 Version Control 的安全回滚链路脱节。

## 覆盖范围

- Requirement：搜索替换
- 核心 Scenario 数：3

## 变更内容

- 固化替换契约：`search:replace:preview` / `search:replace:execute`。
- 固化替换参数：当前文档/全项目范围、`regex/caseSensitive/wholeWord` 开关。
- 固化执行前确认：先预览影响文档数与匹配数，再确认执行。
- 固化全项目替换安全链路：执行前对每个受影响文档创建版本快照，确保逐文档可回滚。
- 固化替换结果回执：替换条数、受影响文档、跳过原因与错误列表。

## 依赖关系

- 上游 change：`search-retrieval-p0-fts-foundation`。
- 规范依赖：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/version-control/spec.md`
  - `openspec/specs/ipc/spec.md`

## Dependency Sync Check

- 核对输入：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/version-control/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/search-retrieval-p0-fts-foundation/specs/search-and-retrieval-delta.md`
- 核对项：
  - 数据结构：替换预览与执行回执字段可判定（文档数、匹配数、失败项）。
  - IPC 契约：`search:replace:preview/execute` 命名与 envelope 合法。
  - 错误码：预览为空、执行冲突、权限阻断与 `VALIDATION_ERROR` 可区分。
  - 阈值：预览延迟与大批量替换稳定性不低于主 spec 边界要求。
- 结论：`NO_DRIFT`
- 后续动作：以 Version Control 快照契约为不可变前置。

## 受影响模块

- `openspec/changes/search-retrieval-p2-replace-versioned/**`
- `apps/desktop/main/src/services/search/**`
- `apps/desktop/main/src/services/version/**`
- `apps/desktop/main/src/ipc/search.ts`
- `apps/desktop/main/src/ipc/version.ts`
- `apps/desktop/renderer/src/features/search/**`
- `packages/shared/types/ipc/**`

## Out-of-scope

- 回滚 UI 细节扩展。
- 排序策略与重排优化。
- 语义检索能力新增。

## 审阅状态

- Owner 审阅：`PENDING`
