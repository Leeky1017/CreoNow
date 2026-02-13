# Proposal: issue-493-p2-entity-matcher

## Why
`openspec/changes/p2-entity-matcher` 定义了 C10 文本-实体匹配能力，但当前代码库仅有 `kgRecognitionRuntime.ts` 的异步 LLM 识别流程，缺少用于 Context Engine Retrieved fetcher 的同步纯函数匹配器。若不交付，C12 `p2-fetcher-detected` 无法按实体 `name/aliases` 检测文本引用，Phase-2 Codex 上下文主线被阻断。

## What Changes
- 按 change 的 S1-S6 场景补充 `entityMatcher` Red→Green→Refactor 测试与实现。
- 新增 `apps/desktop/main/src/services/kg/entityMatcher.ts`，导出：
  - `MatchableEntity`
  - `MatchResult`
  - `matchEntities(text, entities)` 纯函数
- 匹配逻辑满足 delta spec：
  - 仅匹配 `aiContextLevel === "when_detected"`
  - 匹配 `name + aliases` 子字符串（case-sensitive）
  - 同一实体按 `entityId` 去重，`name` 优先
  - 空文本/空实体返回空数组
  - 保证 100 实体 × 1000 字性能约束（<10ms）
- 更新 `openspec/changes/p2-entity-matcher/tasks.md` 与 `openspec/_ops/task_runs/ISSUE-493.md` 证据。
- 完成 preflight、PR auto-merge、change 归档、Rulebook 自归档与 main 收口。

## Impact
- Affected specs:
  - `openspec/changes/p2-entity-matcher/proposal.md`
  - `openspec/changes/p2-entity-matcher/specs/knowledge-graph/spec.md`
  - `openspec/changes/p2-entity-matcher/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/kg/entityMatcher.ts`（new）
  - `apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`（new）
- Breaking change: NO
- User benefit: 当用户文本出现实体名称或别名时，系统可稳定识别并为下游 Retrieved 注入提供 deterministic 输入，减少 AI 续写上下文遗漏。
