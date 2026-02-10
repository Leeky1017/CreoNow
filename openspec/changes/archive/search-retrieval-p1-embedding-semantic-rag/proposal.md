# 提案：search-retrieval-p1-embedding-semantic-rag

## 背景

SR-2 承接 SR-1 的 FTS 基线，补齐向量嵌入、语义搜索与 RAG 检索增强生成。
若不在本阶段统一 chunk 结构、增量嵌入策略与 `embedding:*`/`rag:*` 契约（含默认参数），将导致 Context Engine Retrieved 层注入口径不一致，并在超预算与空召回场景出现不可判定行为。

## 覆盖范围

- Requirement：向量嵌入与语义搜索
- Requirement：RAG 检索增强生成
- 核心 Scenario 数：3 + 3

## 变更内容

- 固化 chunk 数据结构与存储字段：`id/documentId/projectId/text/embedding/startOffset/endOffset/updatedAt`。
- 固化文档 autosave 后的增量嵌入更新策略，仅重算变更段落。
- 固化 `embedding:*` IPC 契约及默认参数（`topK/minScore`），并定义模型不可用时 FTS 回退。
- 固化 `rag:*` IPC 契约及默认参数（`topK=5`、`minScore=0.7`），明确召回结果注入 Context Engine Retrieved 层。
- 覆盖 RAG 空召回与超预算截断场景，保证可判定且不阻断 AI 主流程。

## 依赖关系

- 上游 change：`search-retrieval-p0-fts-foundation`。
- 规范依赖：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/context-engine/spec.md`（Retrieved 层预算消费者）
  - `openspec/specs/ipc/spec.md`

## Dependency Sync Check

- 核对输入：
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/search-retrieval-p0-fts-foundation/specs/search-and-retrieval-delta.md`
- 核对项：
  - 数据结构：chunk 字段完整且与 Retrieved 注入所需最小字段一致。
  - IPC 契约：`embedding:*`/`rag:*` 均为 Request-Response 且响应 envelope 统一。
  - 错误码：模型不可用回退、超时、校验失败可区分。
  - 阈值：`rag:context:retrieve` p95 < 450ms，与 Context Engine token 裁剪规则一致。
- 结论：`NO_DRIFT`
- 后续动作：按 SR-1 输出为前置，进入 Red。

## 受影响模块

- `openspec/changes/search-retrieval-p1-embedding-semantic-rag/**`
- `apps/desktop/main/src/services/embedding/**`
- `apps/desktop/main/src/services/rag/**`
- `apps/desktop/main/src/ipc/embedding.ts`
- `apps/desktop/main/src/ipc/rag.ts`
- `apps/desktop/main/src/services/context/**`
- `packages/shared/types/ipc/**`

## Out-of-scope

- 搜索替换。
- 混合重排与 explain。
- Owner 固定权重和阈值调整。

## 审阅状态

- Owner 审阅：`PENDING`
