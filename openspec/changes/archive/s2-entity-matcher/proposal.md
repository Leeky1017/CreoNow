# 提案：s2-entity-matcher

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（AR-C10）定义了该 change：实现实体名/别名匹配引擎以替换 mock recognizer，并满足性能基线（100 实体 × 1000 字 < 10ms）。该能力是 `s2-fetcher-detected` 进行 when-detected 注入的前置条件。

## 变更内容

- 在 `entityMatcher.ts` 中实现真实匹配逻辑（名字 + 别名）。
- 补齐性能与边界测试（重叠名称、中文匹配、空输入）。
- 明确替换 mock recognizer 的验收条件。

## 受影响模块

- Knowledge Graph：`apps/desktop/main/src/services/kg/entityMatcher.ts`
- KG 测试：`apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`

## 依赖关系

- 上游依赖：`s2-kg-context-level`、`s2-kg-aliases`（依赖字段完整性）。
- 下游依赖：`s2-fetcher-detected`。
- 建议顺序：在 C8+C9 完成后进入 Red。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：Phase 2 依赖图（`s2-entity-matcher` 依赖 C8+C9）与 C10 条目范围。
- 核对项：匹配输入来源（name+aliases）与性能阈值（100×1000<10ms）一致。
- 结论：`NO_DRIFT`（当前草案与路线图一致）。

## 踩坑提醒（防复发）

- 性能测试必须是真实可执行门槛，不得使用弱断言（防 `FAKETEST`）。
- 仅为满足阈值做过度抽象会引发 `OVERABS`，实现应以可验证收益为前提。
- 边界用例（重叠名称/中文/空输入）必须与主流程同等优先。

## 防治标签

- `FAKETEST`
- `OVERABS`

## 不做什么

- 不实现 fetcher 注入与上下文拼装（由 `s2-fetcher-detected` 负责）。
- 不修改 KG CRUD 结构字段定义（由 C8/C9 负责）。
- 不扩展 Sprint 2 之外的识别能力。

## 审阅状态

- Owner 审阅：`PENDING`
