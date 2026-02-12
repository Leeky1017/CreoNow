# 提案：p2-memory-injection

## 背景

当前 `layerAssemblyService.ts` 的 `defaultFetchers()` 中，settings fetcher 返回空 chunks（L1083-1085）。这意味着 AI 上下文的 Settings 层不包含任何用户偏好记忆。`memoryService.ts` 已实现 `previewInjection` 方法（L796-957），可返回 `MemoryInjectionPreview`（含 `items/mode/diagnostics`），但未接入 Context Engine。审计来源：`docs/audit/02-conversation-and-context.md` §3.3（settings fetcher → Memory previewInjection）。

## 变更内容

- 新建 `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`
- 实现 `createSettingsFetcher(deps: { memoryService })` 工厂函数，返回 `ContextLayerFetcher`
- fetcher 内部逻辑：
  1. 调用 `memoryService.previewInjection({ projectId, documentId })`
  2. 如果返回 `ok: false` 或抛出异常 → 返回 `{ chunks: [], warnings: ["MEMORY_UNAVAILABLE: 记忆数据未注入"] }`
  3. 如果 items 为空 → 返回 `{ chunks: [] }`
  4. 格式化 items 为 chunk：`[用户写作偏好 — 记忆注入]\n- <content>（来源：<origin 中文映射>）`
  5. 如果 `diagnostics?.degradedFrom` 存在 → 添加 warning `"MEMORY_DEGRADED: <reason>"`
- 修改 `layerAssemblyService.ts` 的 `defaultFetchers()`，将 settings 位替换为 `createSettingsFetcher`

## 受影响模块

- memory-system delta：`openspec/changes/p2-memory-injection/specs/memory-system/spec.md`
- context-engine 实现（后续）：`apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`（新建）、`apps/desktop/main/src/services/context/layerAssemblyService.ts`

## 不做什么

- 不修改 `memoryService.previewInjection` 方法（已实现）
- 不修改 `assembleSystemPrompt.ts` 的 `memoryOverlay` 参数接入（已有参数位，由上层调用方决定）
- 不实现前端记忆面板 UI

## 依赖关系

- 上游依赖：Phase 1 C2（`p1-assemble-prompt`）提供 `assembleSystemPrompt({ memoryOverlay })` 参数位
- 下游依赖：无

## Dependency Sync Check

- 核对输入：`memoryService.ts` L90-94 的 `previewInjection` 方法签名、L52-56 的 `MemoryInjectionPreview` 返回类型
- 核对项：
  - 数据结构：`previewInjection({ projectId?, documentId?, queryText? })` 返回 `ServiceResult<MemoryInjectionPreview>` → 与 `memoryService.ts` L90-94 一致
  - 数据结构：`MemoryInjectionPreview.items` 包含 `id/type/scope/origin/content/reason` → 与 L43-50 一致
  - 数据结构：`MemoryInjectionPreview.diagnostics?.degradedFrom` 为 `"semantic"` → 与 L55 一致
  - 错误码：`previewInjection` 返回 `ok: false` 时使用 `DB_ERROR` → fetcher 映射为 `MEMORY_UNAVAILABLE`
  - 阈值：无跨模块阈值
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：
  - `apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts`（新建）
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`（修改 `defaultFetchers`）
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/context/__tests__/settingsFetcher.test.ts`
- Mock 要求：mock `memoryService.previewInjection`，禁止依赖真实数据库和 LLM

## 审阅状态

- Owner 审阅：`PENDING`
