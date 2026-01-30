# 07 - Search / Embedding / RAG（FTS5 / semantic / retrieve / fallback）

> 上游 Requirement：`CNWB-REQ-100`  
> 目标：定义 CN V1 的检索三件套（FTS/语义/RAG）的数据模型、错误语义、Windows 风险与降级策略。

---

## 1. Full-text Search（FTS5）

### 1.1 Schema（最小建议）

- `documents_fts`：FTS5 虚表
  - `title`
  - `content_text`
  - `document_id`（外键映射字段，可作为 UNINDEXED）

> 约束：FTS 的索引内容必须来自 derived `content_text`（见 `design/02-document-model-ssot.md`）。

### 1.2 查询语义（MUST）

- `search:fulltext({ query, limit, cursor? })`
  - 必须支持 limit（默认 20）
  - cursor 可选（P1 可实现）
- FTS 语法错误（例如未闭合引号）必须返回：
  - `ok:false`
  - `error.code = "INVALID_ARGUMENT"`

---

## 2. Embedding Service（文本转向量）

### 2.1 V1 目标

CN V1 支持两种 embedding 路径（实现可先做其一，但必须写死降级语义）：

- `local`：本地模型（ONNX / native）
- `remote`：走 AI provider/proxy（OpenAI-compatible）

### 2.2 IPC（最小）

- `embedding:encode({ texts: string[], model?: string })` → `{ vectors: number[][], dimension: number }`
- `embedding:index({ documentId, contentHash })`（异步或同步，但必须可观测）

### 2.3 错误语义（MUST）

- 模型未就绪（未下载/未加载）→ `MODEL_NOT_READY`
- 维度冲突（与已存 dimension 不一致）→ `CONFLICT`（并给出可恢复建议：reindex）
- 其余错误 → `ENCODING_FAILED | INTERNAL`

---

## 3. Vector Store（sqlite-vec 优先，Windows-first 风险）

### 3.1 选择与约束

- 优先：`sqlite-vec`（`vec0`）作为本地向量索引。
- 但 Windows-first 下扩展加载与打包是高风险点，必须具备降级策略（见 §6）。

### 3.2 最小表（示意）

- `document_chunks`：`chunk_id/document_id/text/from/to/hash`
- `document_chunks_vec`：`vec0(chunk_embedding)` + `chunk_id`

> chunking 策略必须确定性（同 `content_text` 必生成同 chunk 列表），否则会造成不可回归的检索漂移。

---

## 4. Semantic Search（语义检索）

### 4.1 IPC（最小）

- `search:semantic({ queryText, projectId?, limit, cursor? })`
  - 返回 `items[]`：`documentId/chunkId/snippet/score`

### 4.2 阈值与分页

- 必须提供 `minScore` / `maxDistance`（二选一）作为阈值控制（默认值写死且可测）。
- cursor 分页可作为 P1，但必须提前定义结构（避免后续 breaking change）。

---

## 5. RAG Retrieve（检索结果进入上下文）

### 5.1 IPC（最小）

- `rag:retrieve({ queryText, projectId, limit, budgetTokens? })`
  - 返回 `items[]`：`sourceRef/snippet/score`
  - 返回 `diagnostics`：预算/裁剪证据（与 context viewer 对齐）

### 5.2 Retrieved layer 格式（MUST）

- 必须提供可解释来源引用（不得使用绝对路径）：
  - `sourceRef` 示例：`doc:<documentId>#chunk:<chunkId>`
- retrieved layer 在 context viewer 中必须可见（`ai-context-layer-retrieved`）。

---

## 6. Windows-first 降级策略（必须可测）

必须覆盖以下降级分支，并在 E2E 中至少断言其中一个：

- sqlite-vec 不可用：
  - `search:semantic` → 返回 `MODEL_NOT_READY` 或降级到 FTS（两者择一，但语义必须写死）
  - `rag:retrieve` → 仍可返回基于 FTS 的结果（best-effort）
- embedding 不可用：
  - `search:semantic` → `MODEL_NOT_READY`
  - `rag:retrieve` → 降级到 FTS

无论哪种降级路径，都不得阻断 Workbench 主链路（编辑/保存/AI rewrite）。

---

## 7. 测试要求（必须）

- Integration：
  - FTS 语法错误 → `INVALID_ARGUMENT`
  - embedding dimension 冲突 → `CONFLICT`
- E2E（Windows）：
  - 创建文档 → 索引 → 搜索命中（FTS 或 semantic）
  - 运行带检索的 skill → context viewer 中出现 retrieved layer

---

## Reference (WriteNow)

参考路径：

- `WriteNow/openspec/specs/sprint-ai-memory-semantic-recall/spec.md`（vec0 + fallback + dimension 冲突语义）
- `WriteNow/openspec/specs/writenow-spec/spec.md`（search/embedding/rag 的能力范围与表结构示例）
- `WriteNow/electron/ipc/search.cjs` / `WriteNow/electron/ipc/embedding.cjs` / `WriteNow/electron/ipc/rag.cjs`（错误映射与降级思路）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- 语义检索链路必须可降级且不得阻断技能运行；降级必须可观测并可在 E2E 断言。
- query-dependent 的检索结果必须进入动态层（retrieved），不得破坏 stablePrefixHash 口径。
