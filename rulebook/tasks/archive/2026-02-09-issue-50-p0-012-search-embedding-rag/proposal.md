# Proposal: issue-50-p0-012-search-embedding-rag

## Why

交付 CN V1 可用且可降级的检索链路：FTS5 全文搜索（确定性错误语义）+ 最小 RAG retrieve（进入 retrieved layer 并可视化）。同时为语义检索/embedding 留出 IPC 契约与可测降级分支，确保 Windows-first 下 sqlite-vec/模型不可用时不阻断主链路。

## What Changes

- Update: SQLite migrations 增加 FTS5 schema（表/触发器/索引），支持基于 derived `content_text` 的全文检索。
- Add: IPC：`search:fulltext` / `search:semantic`（可测降级）/ `embedding:*`（可测 stub）/ `rag:retrieve`。
- Add: Main services：`ftsService` + `ragService`（预算 + portable sourceRef）。
- Add: Renderer SearchPanel + Context retrieved layer 集成（可视化）。
- Add: Integration + E2E tests 覆盖 FTS 错误语义与 retrieved layer 展示。

## Impact

- Affected specs: `openspec/specs/creonow-v1-workbench/design/07-search-embedding-rag.md`；`openspec/specs/creonow-v1-workbench/design/04-context-engineering.md`
- Affected code: `apps/desktop/main/src/db/**`、`apps/desktop/main/src/ipc/**`、`apps/desktop/main/src/services/**`、`apps/desktop/renderer/src/features/**`、tests
- Breaking change: NO（新增 IPC 能力；现有 contract 不变）
- User benefit: 文档检索可用；RAG 引用可解释；在 Windows 环境下可降级且不中断编辑/技能主链路。
