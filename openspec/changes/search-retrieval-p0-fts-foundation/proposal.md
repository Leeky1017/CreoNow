# 提案：search-retrieval-p0-fts-foundation

## 背景

Search & Retrieval 主 spec 的「全文检索（FTS）」是后续语义检索、RAG 与混合重排的地基。
若 P0 不先固化 FTS5 索引、autosave 异步更新、查询/重建 IPC 契约，以及搜索面板三态契约，后续 change 将出现入口行为不一致、错误码不可判定、跨层依赖漂移风险。

## 覆盖范围

- Requirement：全文检索（FTS）
- 核心 Scenario 数：4

## 变更内容

- 固化 FTS5 索引基线：文档纯文本索引、按 `projectId + documentId` 维护、autosave 后异步增量更新。
- 固化 IPC 契约：`search:fts:query`、`search:fts:reindex`（Request-Response + Zod 校验 + 统一 IPC envelope）。
- 固化搜索结果结构：文档标题、匹配片段、高亮区间、定位锚点、相关度分数、文档图标。
- 固化搜索交互：点击结果跳转并闪烁高亮；无结果空态；索引重建中的可见提示。
- 补充搜索面板 Storybook 三态：有结果、无结果、搜索中。

## 依赖关系

- 上游 change：无（SR 链路起点）。
- 规范依赖：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/workbench/spec.md`（命令面板与搜索面板入口）
  - `openspec/specs/ipc/spec.md`（Schema-First、错误 envelope）

## Dependency Sync Check

- 核对输入：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/workbench/spec.md`
  - `openspec/specs/ipc/spec.md`
- 核对项：
  - 数据结构：FTS 结果字段与跳转定位字段可判定。
  - IPC 契约：`search:fts:query/reindex` 命名、Request-Response 语义、`{ ok: true|false }` 响应一致。
  - 错误码：`VALIDATION_ERROR`、`IPC_TIMEOUT` 与检索域错误码可并存且不冲突。
  - 阈值：FTS 首次返回 p95 < 300ms 与主 spec 一致。
- 结论：`NO_DRIFT`
- 后续动作：进入 Red 前无需额外修订上游文档。

## 受影响模块

- `openspec/changes/search-retrieval-p0-fts-foundation/**`
- `apps/desktop/main/src/services/search/**`
- `apps/desktop/main/src/ipc/search.ts`
- `apps/desktop/renderer/src/features/search/**`
- `apps/desktop/renderer/src/stores/searchStore.ts`
- `packages/shared/types/ipc/**`

## Out-of-scope

- 语义搜索与向量嵌入。
- RAG 召回注入与预算截断。
- 搜索替换、混合重排与 explain。

## 审阅状态

- Owner 审阅：`PENDING`
