# Search Retrieval P1 (Embedding + RAG) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver `openspec/changes/search-retrieval-p1-embedding-semantic-rag` with strict TDD and merge it to `main`.

**Architecture:** Keep SR-P0 FTS as lexical baseline, add paragraph-level semantic index and RAG retrieval APIs on top. Semantic unavailability must return deterministic fallback-to-FTS metadata and keep AI flow non-blocking.

**Tech Stack:** TypeScript, Electron IPC, SQLite (better-sqlite3), tsx-based integration/unit tests, OpenSpec + Rulebook + GitHub checks.

---

### Task 1: Red tests for SR2 scenarios

**Files:**

- Create: `apps/desktop/tests/integration/search/semantic-search-topk.test.ts`
- Create: `apps/desktop/tests/integration/search/semantic-fallback-fts.test.ts`
- Create: `apps/desktop/tests/integration/search/embedding-incremental-update.test.ts`
- Create: `apps/desktop/tests/integration/rag/rag-retrieve-inject-context.test.ts`
- Create: `apps/desktop/tests/integration/rag/rag-empty-retrieve.test.ts`
- Create: `apps/desktop/tests/integration/rag/rag-budget-truncation.test.ts`

1. Write failing tests for each scenario.
2. Run each new test and confirm failure is due to missing behavior (not syntax).
3. Record failures in `openspec/_ops/task_runs/ISSUE-360.md`.

### Task 2: Minimal green implementation

**Files:**

- Modify: `apps/desktop/main/src/services/embedding/embeddingService.ts`
- Modify: `apps/desktop/main/src/ipc/embedding.ts`
- Modify: `apps/desktop/main/src/services/rag/ragService.ts`
- Modify: `apps/desktop/main/src/ipc/rag.ts`
- Modify: `apps/desktop/main/src/ipc/search.ts`
- Modify: `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- Modify: `packages/shared/types/ipc-generated.ts`

1. Implement `embedding:*` and `rag:*` required channels.
2. Implement semantic fallback and RAG truncation/empty behaviors.
3. Keep implementation minimal until all Red tests pass.

### Task 3: Refactor + verification + delivery

**Files:**

- Modify: `openspec/changes/search-retrieval-p1-embedding-semantic-rag/tasks.md`
- Modify: `openspec/changes/EXECUTION_ORDER.md`
- Move: `openspec/changes/search-retrieval-p1-embedding-semantic-rag` to archive
- Modify: `openspec/_ops/task_runs/ISSUE-360.md`

1. Run `pnpm contract:generate`, then targeted/new tests, then `pnpm contract:check` + `pnpm cross-module:check` + `pnpm test:unit`.
2. Complete OpenSpec and RUN_LOG evidence.
3. Archive current change and current Rulebook task, then PR auto-merge and sync `main`.
