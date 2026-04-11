> ⚠️ **历史快照**：本分析撰写于项目早期阶段，部分结论已过时（Renderer 已实现、编辑器已从 TipTap 迁移到 ProseMirror、前端不再是 0%）。仅供历史参考，当前架构以 `ARCHITECTURE.md` 为准。

---

# CreoNow — Comprehensive Architecture Analysis Report

> **Project**: CreoNow — AI-native creative writing IDE  
> **Stack**: Electron + React + TypeScript (strict) + TipTap 2 + SQLite + Tailwind CSS v4  
> **Target Users**: Chinese-language creative writers (novelists, screenwriters)  
> **Monorepo**: pnpm workspace (`apps/desktop`, `packages/shared`)

---

## A. Complete OpenSpec Inventory

The project contains **13 domain-specific specs + 1 cross-module integration spec + 1 RFC**, located in `openspec/specs/`.

| # | Spec File | Domain | Lines | Status |
|---|-----------|--------|-------|--------|
| 1 | `ai-service/spec.md` | LLM proxy, streaming, identity prompt, Judge quality | Large | Active |
| 2 | `context-engine/spec.md` | 4-layer context assembly, token budgets | Large | Active |
| 3 | `design-system/spec.md` | 3-layer token architecture, typography | Large | **ALL `<!-- planned -->`** |
| 4 | `document-management/spec.md` | CRUD, status machine, cross-refs, export | Large | Active |
| 5 | `editor/spec.md` | TipTap, autosave, AI inline diff, Zen mode | Large | Active |
| 6 | `ipc/spec.md` | Schema-first contracts, Zod validation, ACL | Large | Active |
| 7 | `knowledge-graph/spec.md` | Entities, relations, auto-recognition, graph viz | Large | Active |
| 8 | `memory-system/spec.md` | 3-layer memory, implicit learning, decay model | Large | Active |
| 9 | `project-management/spec.md` | Lifecycle state machine, dashboard, switching | Large | Active |
| 10 | `search-and-retrieval/spec.md` | FTS5, vector search, RAG, hybrid ranking | Large | Active |
| 11 | `skill-system/spec.md` | 8 built-in skills, scheduling, validation | Large | Active |
| 12 | `version-control/spec.md` | Snapshots, branching, 3-way merge, rollback | Large | Active |
| 13 | `workbench/spec.md` | 3-column layout, icon bar, panels, command palette | Large | Active |
| — | `cross-module-integration-spec.md` | Data flow contracts, IPC channel master table | Large | Active |
| — | `ai-service/rate-limiting-rfc.md` | Rate limiting design | Medium | DRAFT |

### Spec Quality Assessment

**Strengths:**
- Extremely detailed BDD scenarios with `Given/When/Then` for nearly every feature
- Consistent Chinese error messages with i18n display rules
- Explicit capacity limits and SLO thresholds throughout
- Clear boundaries between v0.1 scope and future scope
- Each spec defines its own error codes, aligned with IPC contract

**Weaknesses:**
- Several specs repeat error code definitions that are already centralized in the IPC contract — creates sync risk
- Cross-module integration spec uses `{ success: true/false }` response format whereas the IPC spec mandates `{ ok: true/false }` — format inconsistency
- Design system spec is entirely planned with zero implementation path
- Some specs reference `apps/desktop/renderer/` paths that don't exist (see Section C)

---

## B. Architecture Issues

### B.1 — Missing Renderer Directory (CRITICAL)

**Every spec** references UI components at `apps/desktop/renderer/src/` but this directory **does not exist**.

Evidence:
- `electron.vite.config.ts` L82-93: configures `renderer.root = renderer/`, `renderer/index.html` as entry point, `@: renderer/src` alias
- `.storybook/main.ts`: references `../renderer/src/**/*.stories.@(ts|tsx)`
- Result: `ls apps/desktop/renderer/` → **NO RENDERER DIR**

Available directories under `apps/desktop/`:
```
.storybook/  dist/  dist-electron/  main/  preload/  storybook-static/  tests/
```

**Impact**: The entire frontend is unbuildable. The Electron app has a fully implemented backend (main process, 92 service files) and a complete preload bridge, but **no renderer to display anything**. The Storybook config is also broken (stories path → nonexistent directory).

### B.2 — `creonow-app` Is a Separate Repository

At the project root, `creonow-app/` exists with:
- Its own `.git/` directory (separate git history)
- Its own `package.json` (name: `creonow-app`, Next.js-based)
- NOT listed in `pnpm-workspace.yaml` (only `apps/*`, `apps/desktop/*`, `packages/*`)

This appears to be a **parallel/legacy Next.js prototype** that is not part of the Electron build pipeline. The workspace config explicitly excludes it.

### B.3 — `figma_design/` Directory

Two Figma design exports exist (`CN-fd-v1`, `CN-fd-v2`) containing:
- Full React component tree (72 `.tsx/.ts` files in v2)
- Complete `theme.css` with CSS custom properties
- App layouts, modals, pages, and routing

These are **static Figma-to-code exports**, not the live renderer. They contain the *design intent* for the UI (including the missing renderer).

### B.4 — IPC Contract Schema System

The self-built schema library (`ipc/contract/schema.ts`) reinvents Zod with a minimal `s.string()`, `s.number()`, `s.object()`, etc. API.

**Why not use Zod directly?** The spec mandates Zod validation, and `better-sqlite3` + shared types already use it. The custom `IpcSchema` type system adds maintenance burden without clear benefit. Notably:
- No `.parse()` or `.safeParse()` methods — this is a **description-only schema** used for contract generation
- Runtime validation appears separate (per `runtime-validation.ts` in IPC handlers)

This is a defensible architectural choice (separating contract description from runtime validation), but the spec's "Zod at IPC handler entry" mandate is being met differently than readers might expect.

---

## C. Spec-Implementation Gap Analysis

### Fully Implemented (Backend) — 12 of 13 Specs

| Spec | Service Files | Key Implementation Files | IPC Channels |
|------|--------------|-------------------------|--------------|
| AI Service | 18 files | `aiService.ts`, `assembleSystemPrompt.ts`, `identityPrompt.ts`, `providerResolver.ts`, `judgeQualityService.ts` | 10 channels |
| Context Engine | 10 files | `layerAssemblyService.ts`, `projectScopedCache.ts`, `rulesFetcher.ts`, `settingsFetcher.ts`, `retrievedFetcher.ts` | 11 channels |
| Document Mgmt | 10 files | `documentService.ts`, `documentCrudService.ts`, `branchService.ts`, `versionService.ts`, `threeWayMerge.ts` | 10 channels |
| Knowledge Graph | 8 files | `kgService.ts`, `kgCoreService.ts`, `kgWriteService.ts`, `kgQueryService.ts`, `entityMatcher.ts` | 13 channels |
| Memory System | 6 files | `memoryService.ts`, `episodicMemoryService.ts`, `preferenceLearning.ts`, `userMemoryVec.ts` | 17 channels |
| Project Mgmt | 4 files | `projectService.ts`, `projectLifecycle.ts`, `projectLifecycleStateMachine.ts`, `templateService.ts` | 12 channels |
| Search & Retrieval | 3 files | `ftsService.ts`, `hybridRankingService.ts`, `searchReplaceService.ts` | 6 channels |
| Skill System | 8 files | `skillService.ts`, `skillExecutor.ts`, `skillScheduler.ts`, `skillValidator.ts`, `skillRouter.ts`, `scopeResolver.ts` | 6 channels |
| Version Control | (in documents/) | `versionService.ts`, `branchService.ts`, `threeWayMerge.ts` | 10 channels |
| Export | 2 files | `exportService.ts`, `exportRichText.ts` | 5 channels |
| Embedding | 7 files | `embeddingService.ts`, `embeddingComputeOffload.ts`, `onnxRuntime.ts`, `semanticChunkIndexService.ts` | 3 channels |
| RAG | 5 files | `ragService.ts`, `hybridRagRanking.ts`, `queryPlanner.ts`, `ragComputeOffload.ts` | 2 channels |

**Total IPC channels in contract**: ~150 channels covering all spec domains.

### Spec-Aligned Implementation Highlights

1. **Project Lifecycle State Machine** (`projectLifecycleStateMachine.ts`):
   - Correctly implements `active → archived → deleted` (no direct `active → deleted`)
   - Error code `PROJECT_DELETE_REQUIRES_ARCHIVE` with Chinese message "请先归档项目再删除" — matches spec exactly
   - Uses `{ ok: true/false }` response format — matches IPC spec

2. **Context Engine 4-Layer Assembly** (`layerAssemblyService.ts`):
   - Implements `rules → settings → retrieved → immediate` layer order — matches spec
   - Token budget management with `estimateUtf8TokenCount` — matches spec's token budget allocation
   - Degradation counter for layer failures — robust error handling
   - `projectScopedCache.ts` implementing singleflight deduplication — matches spec's `projectScopedCache` requirement
   - `StablePrefixHash` for prompt caching would likely use the `hashUtils.ts` in shared

3. **Skill Scheduler** (`skillScheduler.ts`):
   - FIFO scheduling with session-level queue — matches spec
   - Slot recovery on timeout/cancellation — matches spec's slot recovery requirement
   - Dependency tracking (`dependsOn`, `isDependencyAvailable`) — exceeds spec requirements

4. **Identity Prompt** (`identityPrompt.ts`):
   - 5 XML-tagged blocks (`<identity>`, `<writing_awareness>`, `<role_fluidity>`, `<behavior>`, `<context_awareness>`) — matches spec's `GLOBAL_IDENTITY_PROMPT` structure exactly
   - Chinese language throughout — matches spec's "始终使用中文回应" directive

5. **Hybrid Ranking** (`hybridRankingService.ts`):
   - Score breakdown with `bm25`, `semantic`, `recency` fields — matches spec's fusion formula
   - Strategy-based routing (`fts | semantic | hybrid`) — matches spec
   - Backpressure tracking — matches spec's capacity management

6. **Preference Learning** (`preferenceLearning.ts`):
   - Feedback weight mapping (`accept: 1, partial: -0.5, reject: -1`) — matches spec's implicit signal system
   - Privacy mode with evidence normalization — matches spec's privacy constraints
   - Evidence ref length bounds — robust boundary validation

### NOT Implemented — Design System (1 of 13 Specs)

The Design System spec is entirely `<!-- planned -->` with no implementation:
- No `design/system/01-tokens.css` file exists
- No `renderer/src/styles/tokens.css` file exists (renderer doesn't exist)
- The `figma_design/CN-fd-v2/src/styles/theme.css` contains the design tokens as CSS custom properties, but this is a Figma export, not the spec's 3-layer token architecture

### NOT Implemented — All Frontend UI (Editor, Workbench, etc.)

Since `apps/desktop/renderer/` doesn't exist:
- **Editor**: No TipTap editor component, no EditorToolbar, no BubbleMenu, no InlineDiff, no ZenMode
- **Workbench**: No 3-column layout, no IconBar, no sidebar, no panel system
- **Knowledge Graph Visualization**: No force-directed graph
- **Memory Panel**: No UI component
- **Version History Timeline**: No UI component
- **Dashboard**: No project cards
- **Command Palette**: No `Cmd/Ctrl+P` implementation
- **All Storybook stories**: None exist (stories path points to missing renderer dir)

---

## D. Fundamental Architectural Problems

### D.1 — Backend-Without-Frontend Anti-Pattern (SEVERITY: BLOCKER)

The project has invested heavily in backend services (92 implementation files, 263 test files, extensive IPC contract) but has **zero renderer code**. This is an inverted development pyramid:

```
IPC Contract (2,411 lines, 150 channels)  ← fully specified
Services (92 files across 15 domains)     ← substantially implemented
Preload Bridge (6 files, security model)  ← implemented
──────────────────────────────────────────
Renderer (0 files)                        ← MISSING ENTIRELY
```

All IPC channels are defined and handled but can never be invoked because no renderer exists to call them.

### D.2 — Fragmented Frontend Codebases

Three separate frontend-like codebases exist, none integrated:

| Codebase | Location | Tech | In Workspace? | State |
|----------|----------|------|--------------|-------|
| Electron Renderer | `apps/desktop/renderer/` | React + TipTap | Expected but **missing** | Non-existent |
| creonow-app | `creonow-app/` | Next.js | **No** (separate .git) | Separate prototype |
| Figma Design Export | `figma_design/CN-fd-v2/` | React (static export) | **No** (not in workspace) | Design reference |

There is no clear migration path from any existing frontend to the Electron renderer.

### D.3 — Spec Over-Engineering Risk

The specs are extremely detailed — to the point where some requirements may be hard to implement faithfully:

- **Memory System**: Forgetting curve formula (`exp(-0.1 × ageInDays) × recallBoost × importanceBoost`), 6 implicit signal types, semantic distillation with conflict detection — this is a research-grade memory system specified for a v0.1 creative writing tool
- **Knowledge Graph**: 50K node / 200K edge capacity, cycle detection, force-directed visualization — enterprise-scale graph for what may be used for 50-100 characters per novel
- **Context Engine**: 4-layer token budget allocation with percentages, Stable Prefix Hash for prompt caching with SHA-256 — sophisticated optimization for a first version

The specs are architecturally sound but risk never being fully implemented due to complexity.

### D.4 — Runtime Governance Centralization

`packages/shared/runtimeGovernance.ts` centralizes all operational limits:

```typescript
ipc.maxPayloadBytes: 10MB
ai.timeoutMs: 10,000ms
ai.rateLimitPerMinute: 60
ai.sessionTokenBudget: 200,000
skills.globalConcurrencyLimit: 8
skills.sessionQueueLimit: 20
kg.queryTimeoutMs: 2,000ms
```

This is a **strength** — all limits are in one place, overridable via env vars, and shared across main/preload. However, some defaults may be aggressive (10s AI timeout for LLM streaming responses is tight).

---

## E. Frontend vs Backend Readiness

### Backend: ~70% Complete

| Area | Status | Evidence |
|------|--------|---------|
| Service Layer | ✅ Substantial | 92 non-test .ts files across 15 service domains |
| IPC Contract | ✅ Complete | 2,411 lines, ~150 channels, all domains covered |
| IPC Handlers | ✅ Substantial | 30+ handler files with ACL, backpressure, validation |
| Preload Bridge | ✅ Complete | 6 files with security audit, payload size limits, channel allowlist |
| Database + Migrations | ✅ Present | `db/` directory with migrations |
| Test Coverage | ✅ Strong | 263 test files (unit, integration, perf/benchmark) |
| Shared Types | ✅ Present | `packages/shared/types/` with generated IPC types |
| Built-in Skills | ✅ Present | `main/skills/` directory with skill definitions |
| Project Templates | ✅ Present | `main/templates/project/` with template system |

### Frontend: 0% Complete

| Area | Status | Evidence |
|------|--------|---------|
| Renderer Directory | ❌ Missing | Directory doesn't exist |
| React Components | ❌ Missing | No components |
| TipTap Editor | ❌ Missing | No editor integration |
| Workbench Layout | ❌ Missing | No layout system |
| Storybook Stories | ❌ Missing | Config exists but stories path is broken |
| Design System CSS | ❌ Missing | Only exists in Figma export, not in project |
| i18n Setup | ❌ Missing | Dependencies installed (`i18next`, `react-i18next`) but no setup |

### Design System: 5% Complete

The design tokens exist in `figma_design/CN-fd-v2/src/styles/theme.css` as CSS custom properties, providing the raw material. But:
- The spec's 3-layer architecture (source → runtime → Tailwind bridge) is not implemented
- No `@theme inline` Tailwind v4 bridging
- No typography presets from the 14-family spec
- The spec itself is entirely `<!-- planned -->`

---

## F. IPC Contract System Quality

### Strengths

1. **Schema-First Design**: The 2,411-line `ipc-contract.ts` defines every channel's request/response schema before any handler is written. A `contract:generate` script produces `packages/shared/types/ipc-generated.ts`.

2. **Exhaustive Error Code Dictionary**: 87 domain-specific error codes covering every spec module (memory, KG, AI, skills, search, context, documents, projects, versions).

3. **Preload Security Gateway** (`preload/src/ipcGateway.ts`):
   - Channel allowlist enforcement
   - Payload size validation with `MAX_IPC_PAYLOAD_BYTES`
   - Security audit logging
   - Request ID generation (crypto.randomUUID with fallback)
   - Payload shape summarization for debugging
   - Proper `{ ok: true/false }` error wrapping

4. **ACL System** (`ipc/ipcAcl.ts`):
   - Origin-based sender verification
   - WebContents ID validation
   - Privileged channel prefix system (e.g., `db:`, `ai:skill:run`)
   - Dev server origin resolution for development mode

5. **Channel Naming Convention**: Consistent `<domain>:<resource>:<action>` format throughout (e.g., `knowledge:entity:create`, `memory:semantic:distill`).

6. **Push Backpressure**: `pushBackpressure.ts` exists for managing push notification flow control.

7. **Project Access Guard**: `projectAccessGuard.ts` provides project-scoped IPC access control.

### Weaknesses

1. **Custom Schema Library vs Zod**: The contract uses a self-built schema system (`s.string()`, `s.object()`, etc.) that describes shapes but doesn't validate. Runtime validation is separate. This split creates a risk of contract-handler divergence.

2. **No Automated Contract-Handler Sync Check**: The `contract:check` script only verifies `ipc-generated.ts` is up-to-date, but doesn't verify that every contract channel has a corresponding handler or vice versa.

3. **Cross-Module Integration Spec Format Mismatch**: The cross-module integration spec uses `{ success: true/false }` in its examples, but the IPC contract and all handlers use `{ ok: true/false }`. This spec-level inconsistency could mislead implementers.

---

## G. Overall Project Structure Quality

### Monorepo Structure

```
CreoNow/
├── pnpm-workspace.yaml          # apps/*, apps/desktop/*, packages/*
├── package.json                  # Root — scripts for build, typecheck, test
├── openspec/specs/               # 13 domain specs + integration spec
├── apps/desktop/
│   ├── main/src/                 # Electron main process (92 service files)
│   │   ├── services/             # 15 service domains
│   │   ├── ipc/                  # 30+ IPC handlers + contract
│   │   ├── db/                   # SQLite + migrations
│   │   └── logging/              # Logging infrastructure
│   ├── preload/src/              # 6 files — security bridge
│   ├── renderer/                 # ❌ MISSING
│   ├── tests/                    # 263 test files
│   └── electron.vite.config.ts   # Build config (references missing renderer)
├── packages/shared/              # Cross-process types + utilities
├── creonow-app/                  # ⚠️ Separate Next.js app (own .git)
└── figma_design/                 # Figma-to-code exports (v1, v2)
```

### Grade: B+ (Backend), F (Frontend), A- (Specs)

**Backend (B+)**: Well-structured services with clear domain boundaries, comprehensive IPC contract, strong test coverage, proper security model in preload. Deduction for custom schema system vs using Zod directly, and some over-engineering in v0.1 scope.

**Frontend (F)**: Does not exist. Build config references it, Storybook config references it, all specs reference it, but the `renderer/` directory is absent.

**Specs (A-)**: Exceptionally detailed with BDD scenarios, error codes, capacity limits, SLO thresholds, and clear scope boundaries. Deduction for the design system being entirely planned, and for the cross-module integration spec's format inconsistency.

### AGENTS.md Governance Model

The project defines a sophisticated agent development workflow:
- **P0-P5 Principles**: Orchestrator-first, spec-first, test-first, deterministic, isolated
- **Dual Audit Protocol**: Two independent audit subagents, zero findings required
- **Worktree-based Development**: Git worktrees for parallel development
- **Red→Green→Refactor**: Strict TDD enforcement

This governance model is well-designed but may be contributing to the backend-without-frontend situation — the rigorous spec+test-first approach has produced comprehensive backend coverage while the UI (where specs are harder to test-first) remains unimplemented.

---

## Summary of Critical Findings

| # | Finding | Severity | Impact |
|---|---------|----------|--------|
| 1 | **Renderer directory missing** | 🔴 Blocker | App cannot be built or run |
| 2 | **Design system entirely planned** | 🟡 Major | No design tokens in codebase |
| 3 | **Three fragmented frontends** | 🟡 Major | No clear path to working UI |
| 4 | **Cross-module format inconsistency** | 🟠 Moderate | `success` vs `ok` in specs |
| 5 | **Custom schema vs Zod mandate** | 🟠 Moderate | Spec says Zod, impl uses custom |
| 6 | **Storybook config broken** | 🟠 Moderate | Stories path → missing dir |
| 7 | **Over-specified for v0.1** | 🟡 Major | Memory/KG complexity vs scope |

### Recommended Priority Path

1. **Create `apps/desktop/renderer/`** — Bootstrap with Vite + React + TipTap, connect to preload bridge
2. **Port design tokens** from `figma_design/CN-fd-v2/src/styles/theme.css` into the renderer
3. **Build minimum viable workbench** — 3-column layout, editor panel, AI panel
4. **Connect IPC** — Wire renderer to the 150 already-defined IPC channels
5. **Deprecate or archive** `creonow-app/` and `figma_design/` to reduce confusion
