# 提案：p2-entity-matcher

## 背景

当前 `kgRecognitionRuntime.ts` 提供的是基于 LLM 的异步实体识别（自动建议添加新实体），但不提供同步的文本-实体名称匹配能力。Context Engine 的 retrieved fetcher（C12）需要一个纯函数 `matchEntities(text, entities)` 来检测光标前后文本中引用了哪些已知实体——这是 NovelCrafter Codex「Include when detected」机制的核心。审计来源：`docs/audit/02-conversation-and-context.md` §3.3。

## 变更内容

- 新建 `apps/desktop/main/src/services/kg/entityMatcher.ts`
- 导出纯函数 `matchEntities(text: string, entities: MatchableEntity[]): MatchResult[]`
- 导出类型 `MatchableEntity`（`id/name/aliases/aiContextLevel`）和 `MatchResult`（`entityId/matchedTerm/position`）
- 匹配规则：只匹配 `aiContextLevel === "when_detected"` 的实体；匹配 `name` + `aliases` 子字符串；按 `entityId` 去重；空文本/空实体返回空数组
- 性能要求：100 实体 × 1000 字 < 10ms

## 受影响模块

- knowledge-graph delta：`openspec/changes/p2-entity-matcher/specs/knowledge-graph/spec.md`
- knowledge-graph 实现（后续）：`apps/desktop/main/src/services/kg/entityMatcher.ts`（新文件）

## 不做什么

- 不修改 `kgRecognitionRuntime.ts`（它是 LLM-based 异步识别，与本模块互补但不替代）
- 不实现 Aho-Corasick 多模式匹配优化（朴素扫描对 100 实体足够，后续可优化）
- 不修改 Context Engine fetcher（C12 负责调用 `matchEntities`）

## 依赖关系

- 上游依赖：C8（`p2-kg-context-level`）提供 `AiContextLevel` 类型；C9（`p2-kg-aliases`）提供 `aliases: string[]` 字段
- 下游依赖：C12（`p2-fetcher-detected`）

## Dependency Sync Check

- 核对输入：C8 delta spec `AiContextLevel` 类型定义、C9 delta spec `aliases: string[]` 字段定义
- 核对项：
  - 数据结构：`MatchableEntity.aiContextLevel` 使用 C8 的 `AiContextLevel` 类型 → 一致
  - 数据结构：`MatchableEntity.aliases` 使用 C9 的 `string[]` → 一致
  - 错误码：无跨模块错误码
  - 阈值：无跨模块阈值
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/kg/entityMatcher.ts`（新建）
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/entityMatcher.test.ts`
- Mock 要求：纯函数，无 IO，无需 mock

## 审阅状态

- Owner 审阅：`PENDING`
