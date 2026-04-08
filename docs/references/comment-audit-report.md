# Comment Quality Audit Report (CC vs CN)

> **Scope**: `apps/desktop/main/src/**/*.ts` (excluding `__tests__/`)
> **Date**: 2025-07-19
> **Method**: Automated scan + manual classification against ARCHITECTURE.md §四 patterns

---

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| Files scanned | 172 |
| Total LOC | 66,563 |
| Total comments | 742 (single-line: 339, JSDoc: 399, multi-line: 4) |
| Comment-to-LOC ratio | 1.1% |
| Files with zero comments | 48 (27.9%) |
| **Overall Quality Score** | **38 / 100** |

CN has developed a strong **"Why:" JSDoc pattern** (204 instances) that rivals CC's explanatory depth. However, three critical gaps remain: **zero `@module` boundary declarations**, **near-zero threshold/magic number coverage** (1.9%), and **no formal decision tags** (`@why`, `@risk`, `@invariant`, `@rollback` = 0 uses). The codebase has pockets of excellent commenting (orchestrator.ts, simpleMemoryService.ts) surrounded by large comment deserts (kgCoreService.ts at 2,452 LOC with 3 comments).

---

## 2. Dimension Scores

### D1: Safety Default Comments — 12 / 20

**What CC does**: Every `catch` block, boolean default, and fallback path has a 1-line comment explaining the fail-closed/fail-safe reasoning (e.g., `// isConcurrencySafe=false — fail-closed: untagged tools assumed unsafe`).

**CN status**:

| Sub-metric | Count | Coverage |
|------------|-------|----------|
| `catch` blocks total | 398 (303 with param + 95 parameterless) | — |
| `catch` blocks with nearby comment | 60 | 15.1% |
| Boolean defaults (`= true/false`) | 54 | — |
| Boolean defaults with comment | 1 | 1.9% |
| Safety-themed comments total | 68 | — |

**Bright spots**: CN has 68 safety-themed comments, including strong patterns like:
- `logging/logger.ts:30` — `Why: logging must never crash the app; fallback to stderr for observability.`
- `services/memory/simpleMemoryService.ts:163` — `Sync failure should not block`
- `services/editor/diffEngine.ts:409` — `Stale document check BEFORE applying (D21 — fail-fast)`

**Gap**: 338 of 398 `catch` blocks have no comment explaining recovery strategy. 53 of 54 boolean defaults lack reasoning.

**Score rationale**: Strong intent visible in key modules, but systematic coverage is extremely low. 12/20.

---

### D2: Performance Decision Comments — 10 / 20

**What CC does**: Annotates parallel initialisation with timing (`startMdmRawRead() // runs during ~135ms import`), marks cache decisions, explains why serial vs parallel.

**CN status**:

| Sub-metric | Count |
|------------|-------|
| Performance-themed comments | 50 |
| Timing/latency annotations | ~5 |
| Cache/batch explanations | ~8 |
| "Otherwise would..." pattern | ~3 |

**Bright spots**:
- `services/ai/streaming.ts:199` — `const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s`
- `index.ts:149` — `// ── Window state persistence (debounced) ──`

**Gap**: No startup-path timing annotations. Large service files (aiService.ts at 2,765 LOC) have performance-relevant code (retry logic, connection pooling, streaming) with minimal perf rationale. The `compressionEngine.ts` and `layerAssemblyService.ts` do token budget work but rarely explain "why this budget number".

**Score rationale**: Some awareness exists but lacks the CC pattern of "not doing X costs Y ms". 10/20.

---

### D3: Threshold / Magic Number Comments — 2 / 20

**What CC does**: Every hardcoded threshold has a data-backed comment (e.g., `MAX_CONSECUTIVE_FAILURES = 3 // BQ data: sessions hit 3,272 consecutive failures, wasting ~250K API calls/day`).

**CN status**:

| Sub-metric | Count |
|------------|-------|
| Lines with hardcoded numbers (>2) | 475 |
| With nearby explanatory comment | 9 |
| Without comment | 466 |
| **Coverage** | **1.9%** |

**Top uncommented thresholds** (highest impact):

| File | Number | Code |
|------|--------|------|
| `services/kg/kgCoreService.ts` | 200,000 | `DEFAULT_EDGE_LIMIT = 200_000` |
| `services/context/tokenEstimation.ts` | 128,000 | `maxTokens = config?.maxTokens ?? 128_000` |
| `services/skills/skillScheduler.ts` | 125,000 | `DEFAULT_SLOT_RECOVERY_TIMEOUT_MS = 125_000` |
| `services/skills/orchestrator.ts` | 120,000 | `PERMISSION_TIMEOUT_MS = 120_000` |
| `services/ai/runtimeConfig.ts` | 120,000 | `MAX_SKILL_TIMEOUT_MS = 120_000` |
| `services/context/layerAssemblyService.ts` | 64,000 | `maxInputTokens: 64000` |
| `services/ai/aiService.ts` | 60,000 | `windowStart = now() - 60_000` |
| `services/diff/types.ts` | 50,000 | `DIFF_MAX_CHARS = 50_000` |
| `services/documents/documentCoreService.ts` | 50,000 | `DEFAULT_MAX_SNAPSHOTS_PER_DOCUMENT = 50_000` |
| `index.ts` | 30,000 | `defaultTimeoutMs: 30_000` |

**Rare good examples**:
- `services/memory/simpleMemoryService.ts:103` — `tokens += 0.25; // ASCII chars are ~0.25 tokens each (4 chars per token)`
- `services/documents/documentCoreService.ts:49` — `MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024`
- `services/context/tokenEstimation.ts:29` — `const nonCjkBytes = bytes - cjkCount * 3;`

**Score rationale**: This is the weakest dimension. 466 unexplained numbers create high refactoring risk. 2/20.

---

### D4: Intent Preservation Comments — 10 / 20

**What CC does**: Multi-step pipelines get a numbered overview comment before the first step (e.g., `// Three-level compression pipeline (execution order, non-exclusive, stackable): 1. Snip 2. Microcompact 3. AutoCompact`).

**CN status**:

| Sub-metric | Count |
|------------|-------|
| Intent/pipeline-themed comments | 46 |
| Stage-numbered comments | 8 (orchestrator.ts) |
| Multi-step overview blocks | ~4 |

**Bright spot — `orchestrator.ts`**: This file is the gold standard for D4 in CN:
```
// Stage 1: intent-resolved
// Stage 2: context-assembled
// Stage 3: model-selected
// Stage 4: AI streaming
// Stage 4.5 (P2): Agentic tool-use loop
// Stage 5: ai-done
// Stage 6: Permission gate
// Stage 8: Post-writing hooks
```

**Gap**: Other multi-step flows lack overview comments:
- `compressionEngine.ts` — compression pipeline without numbered overview
- `layerAssemblyService.ts` — context assembly layers without flow summary
- `kgRecognitionRuntime.ts` — recognition pipeline without step enumeration
- `documentCoreService.ts` — snapshot lifecycle without phase overview

**Score rationale**: One exemplary file, but pattern not replicated elsewhere. 10/20.

---

### D5: Boundary Declaration / @module Comments — 4 / 20

**What CC does**: Every module entry file has `@module` JSDoc with purpose, boundaries ("does not do X"), dependency direction, and invariant references.

**CN status**:

| Sub-metric | Count | Coverage |
|------------|-------|----------|
| Service directories | 20 | — |
| With `@module` in entry file | 0 | **0%** |
| Boundary-themed comments total | 24 | — |
| Files with "Why:" boundary JSDoc | ~10 | — |

**Service directories missing `@module`** (all 20):
`ai`, `context`, `diff`, `documents`, `editor`, `embedding`, `export`, `judge`, `kg`, `memory`, `project`, `projects`, `rag`, `search`, `settings`, `shared`, `skills`, `stats`, `utilityprocess`, `version`

**Partial mitigation**: CN uses a "Why:" JSDoc pattern on IPC handler registration functions that implicitly declares boundaries:
- `ipc/judge.ts:87` — `Why: renderer must be able to observe model readiness and trigger ensure`
- `ipc/constraints.ts:1255` — `Why: constraints are project-scoped rules with S...`
- `ipc/settings.ts:81` — `Why: Settings (character/location lists) are P3 project-scoped data...`

These are valuable but not equivalent to formal `@module` declarations with scope, dependency direction, and invariants.

**Decision tag adoption**: `@why` = 0, `@risk` = 0, `@invariant` = 0, `@rollback` = 0, `INV-*` = 0. The ARCHITECTURE.md §4.2 template defines these tags, but none have been adopted in code.

**Score rationale**: Zero formal boundary declarations; partial coverage via "Why:" pattern. 4/20.

---

## 3. CC vs CN Gap Analysis

> CC = Claude Code / Cursor source patterns (as documented in ARCHITECTURE.md §4.1)
> CN = CreoNow codebase (`apps/desktop/main/src/`)

### What CN does better than typical CC-era codebases

| Pattern | Evidence |
|---------|----------|
| **"Why:" JSDoc convention** | 204 JSDoc blocks with `Why:` — a consistent, discoverable pattern that explains design rationale inline. CC uses scattered comment styles; CN's convention is more systematic. |
| **Orchestrator stage comments** | `orchestrator.ts` demonstrates exemplary pipeline documentation with numbered stages. This matches CC's intent preservation pattern and arguably exceeds it in readability. |
| **IPC handler documentation** | IPC registration functions (`ipc/*.ts`) consistently use structured JSDoc with `Why:` blocks, creating a de facto API documentation layer. |

### Where CC patterns are stronger

| CC Pattern | CC Practice | CN Gap |
|------------|-------------|--------|
| **Threshold provenance** | Every number has a data citation | 98.1% of CN numbers unexplained |
| **Catch-block reasoning** | Every `catch` documents recovery strategy | 84.9% of CN `catch` blocks undocumented |
| **`@module` declarations** | Entry files declare scope, boundaries, deps | 0/20 CN services have `@module` |
| **Decision tags** | `@why`, `@risk`, `@invariant`, `@rollback` | 0 uses in CN |
| **Startup timing** | Parallel init paths annotated with ms budgets | No timing annotations in CN startup |
| **Default-value reasoning** | Boolean defaults explain fail-closed logic | 1/54 boolean defaults explained |

### Structural gap summary

```
CC Comment Architecture:          CN Comment Architecture:
┌─────────────────────┐           ┌─────────────────────┐
│ @module (entry)     │ ← ABSENT  │ (nothing)           │
├─────────────────────┤           ├─────────────────────┤
│ @why/@risk (func)   │ ← ABSENT  │ Why: JSDoc (strong) │
├─────────────────────┤           ├─────────────────────┤
│ threshold citations │ ← WEAK    │ rare inline comment │
├─────────────────────┤           ├─────────────────────┤
│ catch-block reasons │ ← ABSENT  │ (nothing)           │
├─────────────────────┤           ├─────────────────────┤
│ stage/pipeline nums │ ← PARTIAL │ orchestrator only   │
└─────────────────────┘           └─────────────────────┘
```

---

## 4. Top Priority Improvements

Ordered by impact (refactoring risk × code size × comment gap):

| Priority | File(s) | Action | Impact |
|----------|---------|--------|--------|
| **P0** | All 20 service `index.ts` / entry files | Add `@module` JSDoc with scope, boundaries, dep direction | Unlocks AI-assisted refactoring, prevents scope creep |
| **P1** | `services/kg/kgCoreService.ts` (2,452 LOC, 3 comments) | Add threshold comments for `DEFAULT_NODE_LIMIT`, `DEFAULT_EDGE_LIMIT`; add pipeline overview | Largest uncommented service |
| **P2** | `services/memory/episodicMemoryService.ts` (2,629 LOC, 6 comments) | Add `@module`, catch-block reasoning, threshold provenance | Second-largest comment desert |
| **P3** | `services/ai/runtimeConfig.ts` | Document all timeout/limit constants with provenance | Single file, 4 unexplained thresholds, referenced everywhere |
| **P4** | `services/skills/skillScheduler.ts` | Document `DEFAULT_SLOT_RECOVERY_TIMEOUT_MS` and scheduling constants | Critical runtime behaviour |
| **P5** | `services/export/exportRichText.ts` (1,070 LOC, 0 comments) | Add `@module`, function JSDoc for 6 exported functions | Largest zero-comment file |
| **P6** | `services/context/layerAssemblyService.ts` | Add pipeline overview, document `maxInputTokens: 64000` | Token budget = LLM quality |
| **P7** | `services/documents/documentCoreService.ts` | Add `@module`, document snapshot limits, lifecycle overview | Core data layer |
| **P8** | `ipc/contract/ipc-contract.ts` (2,869 LOC, 1 comment) | Add type-level doc comments for channel groups | Largest file, near-zero comments |
| **P9** | All `catch` blocks (398 total) | Add recovery strategy comments (batch via codemod) | Systematic safety gap |

---

## 5. Examples

### 5.1 Good comments found in CN (exemplary)

**Example 1 — Safety reasoning** (`logging/logger.ts:20`):
```ts
/**
 * Best-effort append a JSONL record to disk.
 *
 * Why: logging must never crash the app; on failure we fall back to stderr.
 */
```
*Strength*: Explains the fail-safe contract. A refactorer knows not to add `throw` here.

**Example 2 — Pipeline stages** (`services/skills/orchestrator.ts:258–878`):
```ts
// Stage 1: intent-resolved
// Stage 2: context-assembled
// Stage 3: model-selected
// Stage 4: AI streaming
// Stage 4.5 (P2): Agentic tool-use loop
// Stage 5: ai-done
// Stage 6: Permission gate
// Stage 8: Post-writing hooks
```
*Strength*: Numbered stages give instant overview of the 939-line orchestration flow.

**Example 3 — Boundary at IPC layer** (`ipc/judge.ts:22`):
```ts
/**
 * Validate judge evaluate payload at IPC boundary.
 *
 * Why: handler must return deterministic INVALID_ARGUMENT errors.
 */
```
*Strength*: Declares the IPC contract boundary and explains the error contract.

**Example 4 — Token estimation provenance** (`services/memory/simpleMemoryService.ts:103`):
```ts
tokens += 0.25; // ASCII chars are ~0.25 tokens each (4 chars per token)
```
*Strength*: Explains the math with data backing. Prevents someone changing to 0.5.

**Example 5 — Security isolation** (`index.ts:67`):
```ts
/**
 * Allow E2E to isolate `userData` to a temp directory.
 *
 * Why: Windows E2E must be repeatable and must not touch a developer's real profile.
 */
```
*Strength*: Documents the security/isolation requirement behind the design.

### 5.2 Critical gaps (comments urgently needed)

**Gap 1 — Unexplained 200K limit** (`services/kg/kgCoreService.ts:34`):
```ts
const DEFAULT_EDGE_LIMIT = 200_000;
```
*Risk*: Why 200K? Memory constraint? User research? If someone changes this to 500K, will the app crash? No way to know without original author.

**Gap 2 — Unexplained timeout** (`services/skills/orchestrator.ts:166`):
```ts
const PERMISSION_TIMEOUT_MS = 120_000;
```
*Risk*: Why 2 minutes? UX research? Backend SLA? If reduced to 30s, will permission flows break? No provenance.

**Gap 3 — Largest file, no module declaration** (`ipc/contract/ipc-contract.ts`, 2,869 LOC, 1 comment):
```ts
// (file header: nothing)
export interface IpcContract {
  // ... 2,869 lines of type definitions ...
}
```
*Risk*: This is the single source of truth for all IPC channels. No `@module`, no scope declaration, no dependency rules. AI agents cannot determine what belongs here vs. elsewhere.

**Gap 4 — Zero-comment service** (`services/export/exportRichText.ts`, 1,070 LOC):
```ts
export function parseStructuredExportDocument(...) { ... }
export function renderStructuredMarkdown(...) { ... }
export function buildPdfRenderPlan(...) { ... }
export function renderPdfPlan(...) { ... }
export function buildDocxBuffer(...) { ... }
```
*Risk*: 6 exported functions, 0 JSDoc. Export is user-facing; incorrect output = data loss. No boundary between parse/render/build phases.

**Gap 5 — Silent catch pattern** (338 of 398 catch blocks across codebase):
```ts
} catch (err) {
  // (no comment explaining recovery strategy)
}
```
*Risk*: Without recovery-strategy comments, refactorers cannot distinguish "swallow intentionally" from "forgot to handle". CC documents every catch with `// fail-open: …` or `// fail-closed: …`.

---

## Appendix: Scoring Methodology

Each dimension scores 0–20 based on:

| Score Range | Criteria |
|-------------|----------|
| 18–20 | ≥80% coverage + systematic pattern adoption |
| 14–17 | 50–79% coverage or strong but inconsistent adoption |
| 10–13 | 20–49% coverage or promising but sparse |
| 5–9 | <20% coverage, ad-hoc only |
| 0–4 | Near-zero adoption |

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| D1: Safety Defaults | 12 | 68 safety comments exist; 85% of catch blocks and 98% of boolean-default sites uncovered |
| D2: Performance | 10 | 50 perf comments exist, missing timing annotations and "otherwise" patterns |
| D3: Thresholds | 2 | 9/475 (1.9%) — near-total absence |
| D4: Intent Preservation | 10 | orchestrator.ts is exemplary; not replicated in other pipelines |
| D5: Boundary/@module | 4 | 0/20 services have @module; "Why:" JSDoc provides partial mitigation |
| **Total** | **38** | |

---

*Generated by automated scan. Manual spot-checks confirmed classification accuracy on a sample of 50 comments.*
