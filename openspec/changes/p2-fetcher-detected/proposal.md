# 提案：p2-fetcher-detected

## 背景

当前 `layerAssemblyService.ts` 的 `defaultFetchers()` 中，retrieved fetcher 返回空 chunks（L1086-1088）。根据 NovelCrafter Codex 模型（`docs/audit/02-conversation-and-context.md` §3.3），`aiContextLevel="when_detected"` 的实体应在文本中检测到引用时自动注入 Retrieved 层。这是 Codex 引用检测的核心——用户写到某个配角时，AI 自动获得该角色的档案信息，无需手动复制粘贴。

## 变更内容

- 新建 `apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`
- 实现 `createRetrievedFetcher(deps: { kgService, matchEntities })` 工厂函数，返回 `ContextLayerFetcher`
- fetcher 内部逻辑：
  1. 从 `request.additionalInput` 获取光标前后文本
  2. 调用 `kgService.entityList({ projectId, filter: { aiContextLevel: "when_detected" } })` 获取所有可检测实体
  3. 调用 `matchEntities(text, entities)` 执行匹配
  4. 对每个匹配到的实体，用 `formatEntityForContext`（C11 导出）格式化为 chunk
- 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`，将 retrieved 位替换为 `createRetrievedFetcher`
- 两层降级：KG 查询失败 → `KG_UNAVAILABLE`；matchEntities 异常 → `ENTITY_MATCH_FAILED`

## 受影响模块

- context-engine delta：`openspec/changes/p2-fetcher-detected/specs/context-engine/spec.md`
- context-engine 实现（后续）：`apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`（新建）、`apps/desktop/main/src/services/context/layerAssemblyService.ts`

## 不做什么

- 不实现 RAG 段落检索（留给后续 search-and-retrieval change）
- 不处理 `always` 实体（由 C11 rules fetcher 处理）
- 不处理 `never/manual_only` 实体（不注入）
- 不修改 `matchEntities` 函数（C10 已实现）

## 依赖关系

- 上游依赖：C10（`p2-entity-matcher`）提供 `matchEntities` 函数；C11（`p2-fetcher-always`）提供 `formatEntityForContext` 辅助函数
- 下游依赖：无

## Dependency Sync Check

- 核对输入：C10 delta spec `matchEntities` 函数签名和 `MatchResult` 类型、C8 delta spec `entityList({ filter })` 接口、C11 delta spec `formatEntityForContext` 导出
- 核对项：
  - 数据结构：`MatchableEntity` 包含 `id/name/aliases/aiContextLevel` → 与 C8/C9/C10 一致
  - 数据结构：`MatchResult` 包含 `entityId/matchedTerm/position` → 与 C10 一致
  - IPC 契约：`entityList({ filter: { aiContextLevel: "when_detected" } })` → 与 C8 一致
  - 函数签名：`formatEntityForContext(entity)` → 与 C11 一致
  - 错误码：新增 `ENTITY_MATCH_FAILED`（本 change 内部，不跨模块）
  - 阈值：无跨模块阈值
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：
  - `apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts`（新建）
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`（修改 `defaultFetchers`）
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/retrievedFetcher.test.ts`
- Mock 要求：mock `kgService.entityList` 和 `matchEntities`，禁止依赖真实数据库

## 审阅状态

- Owner 审阅：`PENDING`
