# Spec Delta: Issue-112 Search (FTS + Agent planning + local rerank)

## Scope

This delta defines the V1 retrieval pipeline for CreoNow writing assistance:

- Recall MUST remain lexical-first via SQLite FTS5 for explainability and Windows-first stability.
- An Agent Query Planner stage SHOULD produce multiple FTS queries and MUST emit observable diagnostics.
- Ranking MAY be enhanced by an optional local embedding rerank over topN candidates (no vector database).
- When the local embedding model is not ready (`MODEL_NOT_READY`), the system MUST degrade by skipping rerank
  while still returning best-effort results (must not block skill runs).

## Contract: `rag:retrieve` output

- The API MUST keep the current top-level shape (no breaking change).
- `items[]` MUST remain `{ sourceRef, snippet, score }`.
  - `sourceRef` MUST be a portable reference and MUST NOT include absolute filesystem paths.
  - `snippet` MUST contain the exact text used for ranking/trimming.
  - `score` MUST be a number that can be used for ordering in the UI (higher is better).
- `diagnostics` MUST be present and MUST be sufficient for E2E assertions of rerank enabled vs degraded.

### Diagnostics: minimal required fields

- `diagnostics.mode` MUST be one of:
  - `"fulltext"` (FTS-only)
  - `"fulltext_reranked"` (FTS recall + local rerank applied)
- `diagnostics.planner` MUST include:
  - `queries[]`: the generated FTS queries (in order)
  - `perQueryHits[]`: number of hits for each query (same length as `queries[]`)
  - `selectedCount`: number of candidates selected into `items[]` (post-trim)
- `diagnostics.rerank` MUST include:
  - `enabled`: boolean
  - `reason` (optional): when `enabled=false`, MUST explain why (e.g. `"MODEL_NOT_READY"`)

## Contract: Agent Query Planner

- Input MUST include:
  - `queryText`
  - optional writing context (e.g. current document title/selection/project context)
- Output MUST include:
  - `queries[]`: FTS query strings (may contain phrase queries / AND/OR composition)
- The planner MUST be observable via `rag:retrieve.diagnostics.planner`.

## Contract: Local embedding rerank (topN)

- Rerank input MUST include:
  - the user `queryText`
  - FTS candidates (`snippet` texts) and their base ordering
- Rerank output MUST be:
  - a reordered list of the same candidates (stable sort for equal scores)
  - optional per-item rerank score reported in diagnostics (without changing `items[]` shape)

### Cache & bounds

- The implementation SHOULD cache embeddings of candidate snippets to avoid repeated encoding.
- The cache MUST be bounded (e.g. LRU) to prevent unbounded memory growth.

### Degrade semantics

- If embedding encode returns `MODEL_NOT_READY`, rerank MUST be skipped:
  - Candidate order MUST remain the FTS order.
  - `diagnostics.mode` MUST be `"fulltext"`.
  - `diagnostics.rerank.enabled` MUST be `false`.
  - `diagnostics.rerank.reason` MUST be `"MODEL_NOT_READY"`.

## Test scenarios (must be assertable)

- **Path A (embed ready)**:
  - Construct a synonym/rewrite query where FTS yields multiple plausible candidates.
  - Verify rerank can change the top1 ordering.
  - Assert `diagnostics.mode="fulltext_reranked"` and `diagnostics.rerank.enabled=true`.
- **Path B (MODEL_NOT_READY)**:
  - Verify `rag:retrieve` still returns best-effort results.
  - Assert `diagnostics.rerank.enabled=false` and `diagnostics.rerank.reason="MODEL_NOT_READY"`.

