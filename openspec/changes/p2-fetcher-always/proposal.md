# 提案：p2-fetcher-always

## 背景

当前 `layerAssemblyService.ts` 的 `defaultFetchers()` 中，rules fetcher 返回硬编码桩字符串 `"Skill ${request.skillId} must follow project rules."`（L1073-1082）。这意味着 AI 上下文的 Rules 层不包含任何真实的知识图谱实体数据。根据 NovelCrafter Codex 模型（`docs/audit/02-conversation-and-context.md` §2.5 / §3.3），`aiContextLevel="always"` 的实体（世界观核心规则、主角档案）应始终注入 Rules 层。

## 变更内容

- 新建 `apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`
- 实现 `createRulesFetcher(deps: { kgService })` 工厂函数，返回 `ContextLayerFetcher`
- fetcher 内部逻辑：调用 `kgService.entityList({ projectId, filter: { aiContextLevel: "always" } })` 获取所有 always 实体
- 实现 `formatEntityForContext(entity)` 辅助函数，格式化实体为结构化文本
- 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`，将 rules 位替换为 `createRulesFetcher`
- KG 查询失败时降级返回空 chunks + warning `"KG_UNAVAILABLE"`

## 受影响模块

- context-engine delta：`openspec/changes/p2-fetcher-always/specs/context-engine/spec.md`
- context-engine 实现（后续）：`apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`（新建）、`apps/desktop/main/src/services/context/layerAssemblyService.ts`

## 不做什么

- 不修改 `entityList` 的 `filter` 参数（C8 已实现）
- 不实现 retrieved fetcher（C12 负责）
- 不实现 settings fetcher（C13 负责）
- 不处理 Constraints 注入（已有 Constraints 逻辑独立于 KG 实体注入）

## 依赖关系

- 上游依赖：C8（`p2-kg-context-level`）提供 `entityList({ filter: { aiContextLevel: "always" } })` 接口
- 下游依赖：C12（`p2-fetcher-detected`）复用 `formatEntityForContext`

## Dependency Sync Check

- 核对输入：C8 delta spec `entityList` 新增 `filter.aiContextLevel` 参数
- 核对项：
  - IPC 契约：`entityList({ projectId, filter: { aiContextLevel: "always" } })` 返回 `ServiceResult<{ items: KnowledgeEntity[] }>` → 与 C8 spec 一致
  - 数据结构：`KnowledgeEntity` 包含 `name/type/description/attributes/aiContextLevel` → 一致
  - 错误码：`entityList` 返回 `{ ok: false }` 时 fetcher 降级 → 无新增错误码
  - 阈值：无跨模块阈值
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：
  - `apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts`（新建）
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`（修改 `defaultFetchers`）
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
- Mock 要求：mock `kgService.entityList`，禁止依赖真实数据库

## 审阅状态

- Owner 审阅：`PENDING`
