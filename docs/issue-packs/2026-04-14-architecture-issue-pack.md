# CreoNow Issue Pack (2026-04-14)
This pack is formatted so each file can be pasted into a GitHub Issue with minimal editing.

---

## 00_TRACKER_backend-architecture-hardening.md

# Tracker: Backend architecture hardening after current P1 routing fixes

## Background
The current open P1 issues/PRs are already addressing the immediate invariant-routing gaps:
- `#148` INV-3 CJK token budget fix
- `#149` remove silent catch blocks
- `#152` activate Skill Manifest Loader
- `#154` wire AI IPC handlers to `orchestrator.execute()`
- `#155` route KG write IPC through Skill pipeline
- `#158` canonicalize Skill write-back path
- `#160` editor backend IPC end-to-end through Skill pipeline
- `#161` pass `cachedTokens` into cost tracking

Those are the right first moves. The next layer is to make the backend harder to drift: a real execution boundary, enforced dependency rules, durable ledgers, consistent DB bootstrap, and clearer runtime policy modules.

## Goal
Use this tracker to coordinate the next batch of architecture issues after the current P1 PRs are merged.

## Child issues
- [ ] P1-09 Establish `CommandDispatcher` as the authoritative execution boundary
- [ ] P1-10 Enforce architectural import boundaries in CI
- [ ] P1-11 Persist cost ledger and pricing/budget state to SQLite
- [ ] P1-12 Add a durable task/execution ledger for Skill runs
- [ ] P1-13 Unify SQLite bootstrap, pragma, and migration initialization paths
- [ ] P1-14 Extract provider circuit breaker policy from `providerResolver`
- [ ] P1-15 Complete the Stage-8 post-writing hook chain with deterministic ordering
- [ ] GOV-01 Replace regex-driven PR metadata parsing with a machine-readable block
- [ ] FE-02 Converge frontend stack between `apps/desktop` and `creonow-app`
- [ ] DOC-01 Reconcile `ARCHITECTURE.md` / `AGENTS.md` with code reality

## Recommended order
1. Merge current open P1 fixes first.
2. P1-09 `CommandDispatcher`
3. P1-10 dependency boundary gate
4. P1-11 cost ledger persistence
5. P1-12 durable execution/task ledger
6. P1-13 SQLite bootstrap unification
7. P1-14 provider breaker extraction
8. P1-15 post-writing hook completion
9. GOV-01 / FE-02 / DOC-01

## Notes for implementers
- Keep existing IPC contracts stable unless there is a strong reason to version them.
- Favor incremental migration over “big bang” rewrites.
- Every new boundary should come with tests that prove bypass is impossible or CI-failing.
- Prefer changes that reduce hidden runtime paths and ambiguous side effects.

---

## 01_P1-09_command-dispatcher-boundary.md

# P1-09 Establish `CommandDispatcher` as the authoritative execution boundary

## Background
`ARCHITECTURE.md` says all operations should flow through `core/commandDispatcher.ts`, and IPC handlers should only forward requests. In the current tree, `apps/desktop/main/src/core` exists, but the generic dispatcher is still missing and multiple execution paths are still spread across IPC handlers and service modules.

Current open work is moving specific paths in the right direction (`#154`, `#155`, `#158`, `#160`), but the repo still lacks the single boundary that makes INV-7 actually enforceable across the backend.

## Problem
Today cross-cutting behavior is still fragmented:
- request validation is distributed across handlers and services
- permission checks and orchestration are path-dependent
- cancellation / tracing / metrics / audit hooks cannot be enforced once
- new IPC handlers can accidentally bypass the intended execution path

This keeps the architecture “convention-based” instead of “boundary-based”.

## Goal
Create a real `CommandDispatcher` and make it the only legal execution boundary for mutating, AI-driven, KG-writing, and editor write-back operations.

## Scope
- Add `apps/desktop/main/src/core/commandDispatcher.ts`
- Define a typed command envelope, e.g.
  - `commandType`
  - `requestId`
  - `sessionId`
  - `actor`
  - `payload`
  - optional `cancellationToken` / `origin`
- Move shared cross-cutting concerns into the dispatcher:
  - runtime validation
  - permission gate invocation
  - routing to orchestrator / command handler
  - cancellation handoff
  - structured logging / metrics
  - error normalization
- Refactor IPC handlers so they only:
  - parse transport input
  - call `CommandDispatcher.execute(...)`
  - map result/error back to IPC contract
- Keep existing external IPC contract stable during migration

## Non-goals
- rewriting every service module at once
- changing renderer-facing contracts unless absolutely required
- introducing a remote queue or external job runner

## Implementation notes
- Start with paths already under active correction:
  - AI generation path
  - KG write path
  - document write-back path
  - editor backend write path
- Add an adapter layer if full migration in one PR is too large
- Prefer explicit command handlers over hidden callback chains
- Put one runtime schema validation boundary at dispatcher ingress

## Acceptance criteria
- A real `CommandDispatcher` exists and is used by the relevant IPC handlers
- IPC handlers no longer call mutating service/orchestrator paths directly
- There is a test proving a representative IPC path goes through the dispatcher
- There is a test or CI check that blocks new direct bypass imports/calls
- `ARCHITECTURE.md` and `AGENTS.md` are updated to reflect implemented status

## Suggested validation
- unit tests for dispatcher routing and error normalization
- integration tests for AI / KG / editor write-back through IPC
- grep-based or AST-based audit proving removed direct calls
- contract checks remain green

---

## 02_P1-10_dependency-boundary-gate.md

# P1-10 Enforce architectural import boundaries in CI

## Background
`ARCHITECTURE.md` already defines strict dependency direction, but the CI gate for dependency-direction enforcement is still listed as planned. The desktop backend now spans IPC handlers, core orchestration, services, DB, shared types, renderer, and preload layers. Without a hard gate, the intended layering can drift silently.

## Problem
The architecture currently depends too much on discipline:
- renderer/preload/ipc/core/services/db boundaries are not mechanically enforced
- “temporary” cross-layer imports can become permanent
- new abstractions (dispatcher, ledgers, hooks) can be undermined by direct imports
- code review has to catch structural violations manually

## Goal
Turn architectural boundaries into a failing CI rule.

## Scope
Choose one enforcement approach:
- `dependency-cruiser`, or
- `eslint-plugin-boundaries`, or
- a custom AST/import graph check

Codify allowed directions for at least:
- renderer
- preload
- IPC
- core
- services
- db
- shared / contracts

Add a CI step that fails on boundary violations.

## Required rules
At minimum:
- IPC should not reach across to random deep modules once dispatcher migration is complete
- renderer must not import Electron main-process code
- service modules should not depend on renderer
- DB modules should not depend on higher-level product logic
- shared/contracts should remain low in the dependency graph

## Non-goals
- perfect architectural purity in one pass
- blocking the repo on every historical violation before a baseline strategy exists

## Implementation notes
- Start with a baseline report
- Add temporary allowlists only where necessary, with comments and expiry follow-up
- Keep the rule file readable; it should teach the architecture, not just police it
- Document how to update the rules when new module families are introduced

## Acceptance criteria
- CI fails on a deliberate boundary-violating import
- Allowed directions are documented in-repo
- Existing violations are either fixed or explicitly allowlisted with rationale
- The rule becomes part of the normal gating flow

## Suggested validation
- one positive test repo path
- one negative sample import that must fail in CI
- docs update in `ARCHITECTURE.md`

---

## 03_P1-11_persist-cost-ledger.md

# P1-11 Persist cost ledger and pricing/budget state to SQLite

## Background
The current cost tracking path exposes useful IPC endpoints, but the architecture still describes cost tracking as an in-memory map with bounded record retention and notes that cross-session persistence is planned. `cachedTokens` wiring is now being fixed by `#161`, which makes this the right moment to finish the persistence layer instead of growing the in-memory tracker further.

## Problem
The current state is operationally weak:
- cost history disappears on restart
- budget/pricing context is not guaranteed to be durable
- session-level summaries are restart-sensitive
- auditability of AI usage is weaker than the rest of the system
- analytics and regression debugging are harder than they need to be

## Goal
Persist cost records and relevant pricing/budget configuration to SQLite while keeping the current IPC contract stable.

## Scope
- Add DB tables and migration(s), for example:
  - `ai_cost_records`
  - `ai_cost_sessions` or derived summaries
  - `ai_pricing_snapshots` if needed
  - `ai_budget_settings` if currently only in runtime memory
- Introduce a repository layer under `main/src/db/` or a cost-ledger service
- Update cost tracker to:
  - write durable records
  - preserve `cachedTokens`
  - preserve provider/model/session/request linkage
- Decide whether runtime memory is:
  - a cache in front of SQLite, or
  - replaced by DB-backed queries
- Preserve the existing IPC surface where possible

## Data requirements
Each durable record should include enough fields for post-hoc debugging:
- timestamp
- provider
- model
- direction / operation type
- prompt tokens
- completion tokens
- cached tokens
- total tokens
- estimated cost
- session / request / run identifiers if available

## Non-goals
- sending telemetry to a remote service
- adding a separate analytics database
- replacing SQLite

## Acceptance criteria
- cost history survives app restart
- `cachedTokens` is stored end-to-end
- existing summary/list IPC calls continue to work
- there are migration tests and restart persistence tests
- retention/compaction policy is explicit

## Suggested validation
- write record -> restart app -> list/summary still returns the record
- budget/pricing update persists after restart
- migration upgrade path is tested

---

## 04_P1-12_durable-task-execution-ledger.md

# P1-12 Add a durable task/execution ledger for Skill runs

## Background
The architecture references a target `taskState` design for long-running work, but that durable execution model is not yet a first-class backend capability. CN is increasingly orchestration-heavy: AI generation, multi-step skill execution, permission-gated writes, hook chains, retries, and cancellation all benefit from durable run state.

## Problem
Without a durable execution ledger:
- in-flight state is fragile across restart/crash
- cancellation and retry semantics are harder to reason about
- the backend cannot explain “what happened” for a given run with confidence
- runtime debugging becomes log-driven instead of state-driven
- permission pauses / resumptions are harder to model cleanly

## Goal
Introduce a durable task/execution ledger in SQLite for Skill/command runs.

## Scope
- Add DB tables and migrations, e.g.
  - `task_runs`
  - `task_run_events`
- Represent at least these statuses:
  - queued
  - running
  - waiting_permission
  - completed
  - failed
  - canceled
  - interrupted (if restart recovery needs it)
- Store:
  - command/run identifiers
  - timestamps
  - actor/session/origin
  - current state
  - normalized error info
  - retry/cancel metadata
- Provide a service API for:
  - create run
  - append event
  - transition state
  - query active/history
- Integrate with dispatcher/orchestrator paths incrementally

## Recovery requirements
Define restart semantics explicitly:
- what happens to `running` tasks after app restart?
- should they become `interrupted`?
- which tasks are resumable vs terminal?
- how is cancellation idempotency preserved?

## Non-goals
- distributed job execution
- external queue infrastructure
- workflow orchestration outside the desktop app

## Acceptance criteria
- a representative Skill run produces durable run + event records
- restart recovery semantics are implemented and tested
- cancel/fail/success paths are distinguishable in durable state
- at least one IPC or debug-facing read path can inspect task history

## Suggested validation
- integration test for successful run lifecycle
- integration test for failed run lifecycle
- restart simulation for in-progress run
- cancel-after-start test

---

## 05_P1-13_sqlite-bootstrap-unification.md

# P1-13 Unify SQLite bootstrap, pragma, and migration initialization paths

## Background
The repo currently applies important SQLite setup in more than one place: connection bootstrap logic and DB init/migration bootstrap both open the database and set core pragmas like WAL and foreign keys. This duplication is a drift risk.

## Problem
When DB setup is duplicated:
- pragma policy can diverge over time
- migration bootstrap and normal runtime can behave differently
- bugs become order-dependent
- future tuning has to be updated in multiple places
- it becomes unclear which module is authoritative for DB initialization

## Goal
Create one authoritative SQLite bootstrap path for connection creation, pragma application, and migration startup ordering.

## Scope
- Choose one module as the source of truth for:
  - open connection
  - `journal_mode`
  - `foreign_keys`
  - recommended pragmas
  - migration startup ordering
- Refactor the other path(s) to delegate to the authority module
- Make initialization ordering explicit and documented
- Ensure `setDbInstance(...)` or equivalent singleton wiring remains correct

## Required outputs
- one connection factory / bootstrap authority
- one migration entry path
- one documented init sequence

## Non-goals
- changing DB engine
- replacing current migration mechanism in the same PR unless necessary
- premature micro-optimizations unrelated to init consistency

## Acceptance criteria
- duplicated DB-open + pragma setup logic is removed
- tests prove the required pragmas are applied in the authoritative path
- migration bootstrap uses the same connection policy as runtime
- docs point to the correct bootstrap module

## Suggested validation
- startup integration test
- migration bootstrap test
- explicit assertions for WAL + foreign_keys + recommended pragmas

---

## 06_P1-14_provider-circuit-breaker.md

# P1-14 Extract provider circuit breaker policy from `providerResolver`

## Background
The architecture sets provider failure-threshold behavior and also mentions a more general circuit-breaker module as target architecture. Right now provider health policy is still tightly coupled to provider selection/resolution logic.

## Problem
This coupling makes the runtime harder to evolve:
- provider selection and resilience policy are mixed together
- threshold / cool-down / half-open behavior is harder to reason about
- test coverage is forced through resolver behavior instead of breaker behavior
- future per-provider tuning is awkward
- observability is weaker because state transitions are not modeled as a first-class component

## Goal
Extract provider health / breaker policy into a dedicated module with explicit state transitions and configuration.

## Scope
- Add a dedicated module, e.g. `services/ai/circuitBreaker.ts`
- Move failure accounting / recovery logic out of `providerResolver`
- Define explicit states and transitions
- Make configurable at least:
  - failure threshold
  - cool-down window
  - half-open probe behavior
  - recovery/reset behavior
- Keep provider selection logic focused on choosing a provider using breaker state

## Non-goals
- provider-level persistence across restarts unless clearly justified
- multi-process distributed breaker semantics
- introducing an external resilience library

## Acceptance criteria
- breaker policy is unit-testable without provider resolution scaffolding
- provider resolver consumes breaker state instead of owning the policy
- state transitions are logged/observable
- docs describe the policy module and configuration surface

## Suggested validation
- threshold-open test
- cool-down expiry test
- half-open probe success/failure tests
- provider recovery transition test

---

## 07_P1-15_post-writing-hook-chain.md

# P1-15 Complete the Stage-8 post-writing hook chain with deterministic ordering

## Background
The architecture describes Stage-8 post-writing processing as the place for follow-up work after writes, including version snapshots, KG updates, memory extraction, and quality/judge steps. The repo already has hook-related modules, but the end-to-end contract still needs to be made explicit, deterministic, and easy to test.

## Problem
Without a hardened hook chain:
- write-side effects can stay ambiguous
- ordering assumptions remain implicit
- failures can leak across hooks
- retry/idempotency behavior is harder to prove
- downstream product behavior becomes harder to audit

## Goal
Finish the post-writing hook chain as an explicit, deterministic subsystem.

## Scope
- Define a stable hook interface
- Define canonical ordering, e.g.
  1. version snapshot / autosave version
  2. KG update
  3. memory extraction
  4. quality / judge hook
- Make failure isolation explicit
- Decide idempotency/retry policy per hook
- Add observability:
  - per-hook result
  - timing
  - normalized errors
- Ensure canonical document write-back paths trigger the hook chain exactly once

## Non-goals
- running hooks from arbitrary side paths
- introducing hidden background execution
- coupling hook sequencing to renderer state

## Acceptance criteria
- representative write path triggers hooks in deterministic order
- one failing hook does not corrupt unrelated hook execution policy
- there are integration tests for success, partial failure, and retry-safe behavior
- the hook chain is documented as implemented architecture, not only aspirational design

## Suggested validation
- document write-back integration test
- editor backend write integration test
- hook ordering assertion
- per-hook failure isolation test

---

## 08_GOV-01_machine-readable-pr-metadata.md

# GOV-01 Replace regex-driven PR metadata parsing with a machine-readable block

## Background
CN’s governance is strong: the PR template, preflight rules, and audit protocol require rich metadata such as invariant checklists, validation evidence, rollback notes, and audit gate structure. That is good. The weak point is that machine-required metadata still lives inside human-oriented markdown sections.

## Problem
This makes governance brittle:
- parsers depend on headings and free-form markdown structure
- prose edits can accidentally break automation
- template evolution and parser evolution can drift
- it is harder to validate fields precisely than with a typed schema

## Goal
Move machine-required PR metadata into a machine-readable block while preserving human-readable review text.

## Scope
- Define a schema, preferably one of:
  - YAML frontmatter
  - JSON fenced block
  - TOML fenced block
- Put only machine-read fields in the schema block, such as:
  - linked issue(s)
  - invariant checklist
  - validation evidence presence
  - rollback info presence
  - audit seat metadata
  - visual evidence N/A flags
- Update preflight to parse the structured block instead of relying on heading text
- Keep human summary/risk/context prose outside the structured block

## Non-goals
- reducing governance strictness
- removing audit protocol requirements
- forcing all reviewer commentary into structured fields

## Acceptance criteria
- editing human prose/headings does not break machine parsing
- invalid structured metadata fails preflight with clear errors
- template and parser share one schema source of truth
- migration path for existing PR workflow is documented

## Suggested validation
- parser unit tests with valid/invalid blocks
- preflight end-to-end test
- sample PR body fixtures

---

## 09_FE-02_frontend-stack-convergence.md

# FE-02 Converge frontend stack between `apps/desktop` and `creonow-app`

## Background
The repo currently contains two frontend surfaces with materially different stack choices:
- `apps/desktop` for the Electron product
- `creonow-app` as a separate Next-based app surface

This creates a real risk of duplicated component patterns, styling systems, and product behavior drift.

## Problem
Dual frontend stacks have a compounding cost:
- duplicated dependency weight
- inconsistent design-system decisions
- harder component reuse
- more cognitive load for contributors/agents
- more ways for UX behavior to drift between surfaces

## Goal
Make an explicit product/architecture decision about the two frontend surfaces and converge the stack accordingly.

## Scope
- Inventory frontend dependencies by surface
- Decide which surface is:
  - strategic
  - experimental
  - deprecated/frozen
- Define the canonical design token/component path
- If both surfaces remain, define how shared primitives are authored and consumed
- If one surface is de-emphasized, produce a removal/freeze plan

## Decision output
Ship an ADR or equivalent document that answers:
- Why do both surfaces exist?
- Which one is primary?
- What is shared vs intentionally separate?
- Which UI libraries remain vs are phased out?

## Non-goals
- rewriting the entire UI in one PR
- forcing false parity between desktop and web if product goals differ

## Acceptance criteria
- there is a written architectural decision
- dependency overlap/redundancy is explicitly reviewed
- follow-up migration/removal tasks are enumerated
- design-system ownership is unambiguous

---

## 10_DOC-01_architecture-doc-reconciliation.md

# DOC-01 Reconcile `ARCHITECTURE.md` / `AGENTS.md` with current code reality

## Background
CN explicitly asks contributors/agents to read architecture/governance documents before changing the code. That only works if those docs accurately distinguish what is implemented, what is partial, and what is still target-state design.

## Problem
Some architecture descriptions are now drifting behind the code:
- implemented files/modules can still be described as planned
- target-state items and current-state items are not always clearly separated
- agents can make worse decisions because they are reading stale system boundaries first

## Goal
Make the architecture docs operationally reliable again.

## Scope
- Audit `ARCHITECTURE.md`, `AGENTS.md`, and related docs against current code
- For each major subsystem, mark status explicitly:
  - implemented
  - partial
  - planned
- Focus especially on:
  - command dispatch boundary
  - permission gate
  - post-writing hooks
  - cost tracking persistence
  - provider breaker policy
  - dependency boundary checks
- Add “last verified” notes if helpful

## Non-goals
- polishing prose without fixing semantic drift
- expanding docs volume for its own sake

## Acceptance criteria
- major architecture sections clearly separate current vs target state
- docs no longer describe existing modules as merely hypothetical
- contributors can use docs as implementation guidance without reverse-engineering reality first
