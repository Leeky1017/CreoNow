# 提案：p2-kg-context-level

## 背景

当前 `KnowledgeEntity` 类型（`kgService.ts` L47-57）不包含 `aiContextLevel` 字段。所有实体在 AI 上下文组装时无法区分注入策略——无法实现 NovelCrafter Codex 4 级 AI 上下文控制（`docs/audit/02-conversation-and-context.md` §2.5 / §3.3）。不改则 Context Engine 的 rules/retrieved fetcher 无法按级别筛选实体，Codex 模型无法落地。

## 变更内容

- 在 `KnowledgeEntity` 类型上新增 `aiContextLevel` 字段，类型为 `"always" | "when_detected" | "manual_only" | "never"`，默认值 `"when_detected"`
- 新增 `AiContextLevel` 类型定义和 Zod enum 校验
- SQLite migration：`ALTER TABLE kg_entities ADD COLUMN ai_context_level TEXT NOT NULL DEFAULT 'when_detected'`
- 修改 `entityCreate`：不传 `aiContextLevel` 时默认 `"when_detected"`
- 修改 `entityUpdate`：支持 patch `aiContextLevel`
- 修改 `entityList`：支持 `filter.aiContextLevel` 参数，生成 `WHERE ai_context_level = ?` SQL
- 修改 `rowToEntity`：从数据库行读取 `ai_context_level` 映射到 `aiContextLevel`

## 受影响模块

- knowledge-graph delta：`openspec/changes/p2-kg-context-level/specs/knowledge-graph/spec.md`
- knowledge-graph 实现（后续）：`apps/desktop/main/src/services/kg/kgService.ts`

## 不做什么

- 不实现前端 UI（KG 编辑页面的 aiContextLevel 下拉选择留给后续 UI change）
- 不实现引用检测逻辑（C10 `p2-entity-matcher` 负责）
- 不修改 Context Engine fetcher（C11/C12 负责）

## 依赖关系

- 上游依赖：无
- 下游依赖：C10（`p2-entity-matcher`）、C11（`p2-fetcher-always`）、C12（`p2-fetcher-detected`）

## Dependency Sync Check

- 核对输入：无上游依赖
- 核对项：N/A
- 结论：`N/A`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/kg/kgService.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.contextLevel.test.ts`
- Mock 要求：使用内存 SQLite（`better-sqlite3`），与现有 KG 测试一致；无需 mock LLM

## 审阅状态

- Owner 审阅：`PENDING`
