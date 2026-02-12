# 提案：p2-kg-aliases

## 背景

当前 `KnowledgeEntity` 类型（`kgService.ts` L47-57）不包含 `aliases` 字段。Codex 引用检测（C10 `p2-entity-matcher`）需要通过实体的 `name` 和 `aliases` 匹配文本中的引用——没有别名字段，同一角色的不同称呼（如「林默」/「小默」/「默哥」）无法被识别为同一实体。审计来源：`docs/audit/02-conversation-and-context.md` §3.3。

## 变更内容

- 在 `KnowledgeEntity` 类型上新增 `aliases: string[]` 字段，默认值为空数组 `[]`
- SQLite migration：`ALTER TABLE kg_entities ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]'`
- 数据库中以 JSON 字符串存储，读取时 `JSON.parse`，写入时 `JSON.stringify`
- 修改 `entityCreate`：不传 `aliases` 时默认 `[]`；传入时过滤空白项后 `JSON.stringify` 存储
- 修改 `entityUpdate`：支持 patch `aliases`
- 修改 `rowToEntity`：从数据库行 `JSON.parse(row.aliases)` 映射到 `string[]`，parse 失败回退空数组
- 新增 Zod schema：`z.array(z.string())` + transform 过滤空白字符串；非数组输入返回 `VALIDATION_ERROR`

## 受影响模块

- knowledge-graph delta：`openspec/changes/p2-kg-aliases/specs/knowledge-graph/spec.md`
- knowledge-graph 实现（后续）：`apps/desktop/main/src/services/kg/kgService.ts`

## 不做什么

- 不实现前端 UI（别名输入组件留给后续 UI change）
- 不实现引用检测逻辑（C10 `p2-entity-matcher` 负责）
- 不修改 `aiContextLevel`（C8 负责）

## 依赖关系

- 上游依赖：无
- 下游依赖：C10（`p2-entity-matcher`）

## Dependency Sync Check

- 核对输入：无上游依赖
- 核对项：N/A
- 结论：`N/A`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/kg/kgService.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
- Mock 要求：使用内存 SQLite（`better-sqlite3`），与现有 KG 测试一致；无需 mock LLM

## 审阅状态

- Owner 审阅：`PENDING`
