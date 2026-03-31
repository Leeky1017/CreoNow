# CC Source Code → CN Migration Map

## Executive Summary

After thorough analysis of the Claude Code (CC) source at `src/`, this report identifies which files and patterns provide genuine architectural value for CreoNow (CN). The analysis is **highly selective** — CN is a creative writing tool with an Electron + ProseMirror UI, not a CLI coding assistant.

**Bottom line**: CC's architecture is deeply entangled with CLI/terminal concerns. Only ~15% of the source has direct migration value. The most valuable assets are **architectural patterns** (not copy-pasteable code): the query loop's async-generator streaming, the Tool abstraction shape, the cost tracker's accumulation model, the state store pattern, and the file history snapshot design.

---

## 1. `src/QueryEngine.ts` — Session-Level Query Orchestrator

**What it does**: Owns the conversation lifecycle for SDK/headless mode. One instance per conversation. Manages: system prompt assembly, permission wrapping, message persistence, user input processing, plugin/skill loading, and delegating to `query()` for the actual API loop.

**Migrate**: PARTIAL

**What's useful**:
- The `QueryEngineConfig` type shape (lines 136-175) is an excellent blueprint for CN's `WritingEngine` config: `tools`, `commands`, `canUseTool`, state getters/setters, `maxBudgetUsd`, custom prompts, thinking config
- The `submitMessage()` async generator pattern — yielding `SDKMessage` events as a stream — maps directly to CN's "stream result → show diff → user confirm" pipeline
- The system prompt assembly pattern: `fetchSystemPromptParts()` → merge user context + system context + custom prompt → `asSystemPrompt()` — maps to CN's "current chapter + character settings + user preferences" assembly
- File history snapshot integration (`fileHistoryMakeSnapshot`, `updateFileHistoryState`) — the hook pattern for version snapshots

**What to strip**:
- All SDK/CLI message types (`SDKMessage`, `SDKPermissionDenial`, etc.)
- Coordinator mode, MCP clients, agent definitions, bridge concerns
- CLAUDE.md memory injection, skill discovery prefetch
- Transcript recording, session persistence logic
- Permission denial tracking, orphaned permission handling

**CN Mapping**: → `WritingEngine` class — the top-level orchestrator that accepts a writing request and produces a stream of events

---

## 2. `src/query.ts` — Core Query Loop (API Call + Tool Execution)

**What it does**: The inner loop: call model → stream response → detect tool_use → execute tools → loop. Handles auto-compaction, token budget tracking, microcompact, reactive compact, context collapse, fallback models, max-output-tokens recovery.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- The `QueryParams` type (lines 192-213): `messages`, `systemPrompt`, `userContext`, `systemContext`, `canUseTool`, `toolUseContext`, `maxTurns` — clean parameterization of a query call
- The `State` type (lines 216-228): mutable cross-iteration state carried between loop iterations — a pattern CN needs for multi-turn writing sessions
- The async generator `query()` → `queryLoop()` wrapper pattern — separating command lifecycle notifications from the core loop
- Auto-compact threshold logic and token budget checking — CN needs this to manage context windows when assembling novel chapters + character bibles + style guides
- The streaming loop pattern: `for await (const message of deps.callModel(...))` with interleaved tool execution

**What to strip**:
- Reactive compact, context collapse, snip compact (overengineered for CN's simpler context)
- Microcompact, cache editing
- Streaming tool executor concurrent/serial partitioning (CN has simpler tools)
- Agent/subagent/coordinator concerns
- Feature flags (`feature('HISTORY_SNIP')`, etc.)
- Dump prompts, VCR, speculation

**CN Mapping**: → `writingLoop()` — the inner loop that calls the model with assembled context + writing tools, streams the response, and handles tool calls (continue writing, check consistency, etc.)

---

## 3. `src/context.ts` — Context Assembly

**What it does**: Builds the system context (git status, date) and user context (CLAUDE.md files) that get prepended to conversations. Memoized for conversation duration.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- The memoized context assembly pattern: `getSystemContext = memoize(async () => {...})` and `getUserContext = memoize(async () => {...})` — assembling context once per conversation, cached
- The `setSystemPromptInjection()` cache-invalidation pattern — clearing memoized context when injection changes
- The separation of system context (environment state) from user context (project-specific configuration)

**What to strip**:
- All git-specific logic (git status, branch, commits, user name)
- CLAUDE.md file loading, bare mode, remote mode
- Feature flags, diagnostic logging

**CN Mapping**: → `getProjectContext()` (character sheets, world bible, style settings) and `getChapterContext()` (current chapter text, surrounding chapters, continuity notes). Same memoize-per-session pattern.

---

## 4. `src/cost-tracker.ts` — Cost/Token Tracking

**What it does**: Tracks API usage costs across models: input/output tokens, cache read/write, web search. Accumulates per-model, persists to project config, formats for display.

**Migrate**: YES (heavily adapted)

**What's useful**:
- The `StoredCostState` type and session-scoped cost persistence pattern (`getStoredSessionCosts`, `restoreCostStateForSession`, `saveCurrentSessionCosts`)
- `addToTotalSessionCost()` — the accumulation function that takes an API `Usage` response and updates all counters
- `formatTotalCost()` / `formatModelUsage()` — display formatters
- The model-level usage breakdown pattern (`usageByShortName`)
- `calculateUSDCost()` from `modelCost.ts` — pricing lookup by model

**What to strip**:
- chalk formatting (CN uses its own UI)
- OpenTelemetry counters (`getCostCounter`, `getTokenCounter`)
- Analytics events, diagnostic logging
- FPS metrics, lines added/removed tracking
- Advisor usage

**CN Mapping**: → `CostTracker` service — tracks per-session writing costs. The `ModelCosts` pricing tier pattern from `modelCost.ts` maps directly. CN should show cost in its status bar. Session persistence pattern → CN's project file.

---

## 5. `src/costHook.ts` — Cost Summary React Hook

**What it does**: React hook that writes cost summary on process exit.

**Migrate**: NO

**Why**: CLI-specific (writes to stdout on exit). CN will display costs in its own Electron UI.

---

## 6. `src/Tool.ts` — Tool/Skill Type Definitions

**What it does**: Defines the core `Tool` type, `ToolUseContext` (the massive context object passed to every tool), `ToolPermissionContext`, and utility types for tool progress, tool matching, validation.

**Migrate**: PARTIAL

**What's useful**:
- The `Tool` type shape (defined elsewhere but shaped by this file's `ToolUseContext`): name, description, input schema (zod), execute function, permission checking — this is the blueprint for CN's `WritingSkill` interface
- `ToolPermissionContext` concept: mode-based permissions (`default`, `acceptEdits`, `plan`), always-allow/deny/ask rules — maps to CN's confirm-before-destructive-write pattern
- `ToolInputJSONSchema` type — clean JSON schema for tool inputs
- `ToolUseContext.options` shape: available tools, thinking config, model settings, commands
- `ValidationResult` type — clean validation pattern

**What to strip**:
- All MCP-related fields (mcpClients, mcpResources, elicitation)
- Agent/subagent fields (agentId, agentType, subagent concerns)
- File state cache, content replacement state, denial tracking
- IDE selection, notification, OS notification
- Bridge, speculation, coordinator concerns
- Companion, voice, vim references
- ~70% of the `ToolUseContext` fields

**CN Mapping**: → `WritingSkill` interface + `WritingContext` (simplified ToolUseContext). CN skills: `ContinueWritingSkill`, `PolishSkill`, `RewriteSkill`, `ConsistencyCheckSkill`, `CharacterVoiceSkill`.

---

## 7. `src/tools.ts` — Tool Registry

**What it does**: Imports all tool implementations and assembles the tool list. Feature-gated conditional imports for optional tools.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- The `getAllBaseTools()` pattern — a function that returns the tool array, with conditional tools added based on feature flags/config
- The deduplication pattern (`uniqBy`)
- The permission-checking deny-rule pattern (`getDenyRuleForTool`)

**What to strip**:
- All specific tool imports (BashTool, FileEditTool, GlobTool, etc.)
- Feature flag conditionals
- Specific tool constants

**CN Mapping**: → `getAllWritingSkills()` function that assembles the skill registry

---

## 8. `src/Task.ts` — Background Task Abstraction

**What it does**: Defines task types (local_bash, local_agent, remote_agent), task states (pending/running/completed/failed/killed), task ID generation, and the polymorphic `Task` interface (name, type, kill).

**Migrate**: PARTIAL (type patterns only)

**What's useful**:
- `TaskStatus` type and `isTerminalTaskStatus()` — clean state machine for background operations
- `TaskStateBase` type — id, type, status, description, startTime, endTime
- `generateTaskId()` — secure random ID generation with type prefix

**What to strip**:
- All specific task types (bash, agent, remote agent, dream, workflow, monitor)
- Output file/offset pattern (CLI-specific)

**CN Mapping**: → `WritingTaskStatus` for CN's background operations (e.g., full-novel consistency check, batch export)

---

## 9. `src/tasks.ts` — Task Registry

**What it does**: Mirrors `tools.ts` pattern — imports all task implementations, returns them from `getAllTasks()`.

**Migrate**: NO (pattern already captured from tools.ts)

---

## 10. `src/commands.ts` — Command Registration

**What it does**: Imports ~70+ slash commands and assembles them. Feature-gated imports for optional commands.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- The `Command` type shape (defined in `types/command.ts`): name, description, aliases, type (`prompt` | `local-jsx` | `local-async`), execute pattern
- The static command registry pattern — all commands imported at module level
- Skill-command bridge: `getSlashCommandToolSkills()` — commands that become available as tools

**What to strip**:
- All 70+ specific command imports
- CLI-specific commands (git, vim, terminal, bridge, etc.)

**CN Mapping**: → CN's command palette entries. The `Command` type maps to CN's menu/command actions.

---

## 11. `src/history.ts` — Prompt History

**What it does**: JSONL-based prompt history with paste content management. Stores/retrieves history entries, supports reference expansion for pasted text and images.

**Migrate**: NO

**Why**: CLI prompt history — CN uses Electron input with its own undo/history. However, `parseReferences()` and `expandPastedTextRefs()` are interesting patterns if CN needs inline reference expansion.

---

## 12. `src/setup.ts` — Initialization

**What it does**: CLI startup: node version check, session ID, UDS messaging, terminal backup/restore, worktree creation, tmux setup, git root detection, hooks config, project config loading.

**Migrate**: NO

**Why**: Entirely CLI/terminal-specific. CN has its own Electron app initialization.

---

## 13. `src/bootstrap/state.ts` — Global Singleton State

**What it does**: A massive global mutable state object holding: session ID, cost counters, model usage, telemetry state, feature flags, session-only settings. ~200+ fields. Exported via getter/setter functions.

**Migrate**: PARTIAL (small subset)

**What's useful**:
- Cost-related state fields and their getter/setter pattern: `totalCostUSD`, `modelUsage`, `totalInputTokens`, `totalOutputTokens`
- Session ID management: `getSessionId()`, `switchSession()`
- The pattern of typed getters/setters for global state rather than raw global objects

**What to strip**:
- ~90% of fields (telemetry, CLI, agent colors, API requests, OTEL, etc.)
- All CLI/terminal-specific state
- Feature flags, plugin state, coordinator state

**CN Mapping**: → CN should NOT use this pattern (global mutable singletons are bad in Electron). Instead, use the store pattern from `state/store.ts`.

---

## 14. `src/state/store.ts` — Minimal Reactive Store

**What it does**: A clean, minimal 35-line reactive store: `createStore(initialState, onChange)` → `{ getState, setState, subscribe }`. Listener notification on state change.

**Migrate**: YES

**What's useful**:
- The entire file — it's a perfect, minimal, framework-agnostic reactive store
- `Object.is()` equality check to avoid unnecessary updates
- Clean listener management with Set
- onChange callback for side effects

**CN Mapping**: → Direct use as CN's core state store pattern. Can be used for both writing session state and UI state in the Electron renderer.

---

## 15. `src/state/AppStateStore.ts` — Application State Shape

**What it does**: Defines the full `AppState` type (400+ lines) with all UI state, permissions, MCP, plugins, tasks, bridge state, etc. Plus `getDefaultAppState()`.

**Migrate**: PARTIAL (structural pattern only)

**What's useful**:
- The pattern of a single typed `AppState` with `DeepImmutable<{...}>` for immutable sections and mutable escape hatches for Maps/functions
- `getDefaultAppState()` factory for clean initialization
- `CompletionBoundary` type — tracking when/how an operation completed

**What to strip**:
- All CLI-specific state (bridge, remote, agent, coordinator, MCP, plugins, teams, worktree, etc.)

**CN Mapping**: → `WritingAppState` type with: project state, session state, tool permissions, cost state, file history state, editor preferences

---

## 16. `src/plugins/builtinPlugins.ts` — Plugin Registry

**What it does**: Registers/manages built-in plugins with enable/disable via user settings. Plugins provide skills, hooks, and MCP servers.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- The `BuiltinPluginDefinition` type: name, description, version, defaultEnabled, isAvailable, hooks, mcpServers
- Enable/disable via user settings with defaultEnabled fallback
- Plugin → LoadedPlugin transformation pattern

**What to strip**:
- MCP server concerns, marketplace integration
- Plugin-specific loading logic

**CN Mapping**: → CN's plugin system for custom writing tools (custom style analyzers, genre-specific skills, etc.)

---

## 17. `src/skills/bundledSkills.ts` — Skill Definition & Registration

**What it does**: Defines `BundledSkillDefinition` type and `registerBundledSkill()`. Skills are commands with: name, description, allowed tools, prompt generator, optional reference files extracted to disk.

**Migrate**: YES (pattern)

**What's useful**:
- `BundledSkillDefinition` type: name, description, whenToUse, allowedTools, model, getPromptForCommand, hooks, context (`inline` | `fork`), files for reference docs
- The skill → command conversion pattern
- Reference file extraction pattern (bundled files → disk on first invocation)
- `argumentHint` for skill invocation UI

**CN Mapping**: → `WritingSkillDefinition` — CN's skill definitions (continue, polish, rewrite, etc.) follow this exact pattern: name, description, allowed tools, prompt template, optional reference style guides.

---

## 18. `src/skills/loadSkillsDir.ts` — Skill Loading from Filesystem

**What it does**: Loads skill definitions from markdown files on disk (user, project, managed directories). Parses frontmatter for config, supports argument substitution.

**Migrate**: PARTIAL

**What's useful**:
- Markdown-based skill definition with frontmatter (name, description, whenToUse, allowedTools, model)
- `parseFrontmatter()` integration for configuration
- Skill path resolution from multiple sources (user, project, managed)
- The `LoadedFrom` type: where a skill/command was loaded from

**What to strip**:
- Git-specific skill filtering, gitignore integration
- CLI-specific paths, managed settings paths
- Plugin-specific loading, MCP skill builders

**CN Mapping**: → CN's user-defined writing skills loaded from `~/.creonow/skills/` — users can define custom skills as markdown templates.

---

## 19. `src/schemas/hooks.ts` — Hook Schema Definitions

**What it does**: Zod schemas for hook definitions: command hooks, prompt hooks, HTTP hooks. Hooks fire on events (PreToolUse, PostToolUse, etc.).

**Migrate**: PARTIAL

**What's useful**:
- The concept of lifecycle hooks: `PreToolUse`, `PostToolUse`, `SessionStart`
- Hook schema shape: type, command/prompt/url, if-condition, timeout, statusMessage
- Conditional execution via permission-rule-style `if` patterns

**What to strip**:
- Shell/command hooks (CN doesn't execute shell commands)
- HTTP hooks (CN uses IPC, not HTTP)

**CN Mapping**: → `WritingHooks` schema: `PreWrite`, `PostWrite`, `PrePublish`, `ConsistencyCheck` hooks

---

## 20. `src/services/compact/autoCompact.ts` — Auto-Compaction

**What it does**: Manages automatic context compaction when token usage exceeds thresholds. Calculates warning/error/blocking limits, triggers compaction, circuit-breaker for consecutive failures.

**Migrate**: PARTIAL

**What's useful**:
- `getEffectiveContextWindowSize()` — calculating usable context window
- `getAutoCompactThreshold()` — threshold calculation with buffer reserves
- `calculateTokenWarningState()` — percent-left, warning/error/blocking thresholds
- `AutoCompactTrackingState` — tracking compaction state across turns
- Circuit breaker pattern (`MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES`)

**What to strip**:
- Feature flags, environment variable overrides
- Session memory compaction, reactive compaction
- Post-compact cleanup hooks

**CN Mapping**: → CN's chapter context budget management. When a novel chapter + character bible + style guide exceeds the context window, CN needs to summarize/compact older context.

---

## 21. `src/services/tools/toolOrchestration.ts` — Tool Execution Orchestration

**What it does**: Partitions tool calls into concurrent-safe batches (read-only tools parallel, write tools serial) and executes them.

**Migrate**: PARTIAL

**What's useful**:
- The `partitionToolCalls()` pattern — categorizing tools as concurrent-safe vs not
- Serial vs parallel execution based on safety classification
- Context modifier queuing for concurrent execution
- The `MessageUpdate` yield pattern: message + new context per tool result

**What to strip**:
- Concurrency limit from env var
- Specific tool type checking

**CN Mapping**: → CN's skill execution. Read-only skills (consistency check, character analysis) can run in parallel; write skills (continue, rewrite) must be serial.

---

## 22. `src/services/tools/toolExecution.ts` — Tool Execution Core

**What it does**: Executes individual tool calls: schema validation, permission checking, tool invocation, progress tracking, error handling, telemetry.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- The tool execution lifecycle: validate input → check permissions → execute → handle result/error
- Progress event emission during tool execution
- Permission result handling (allow/deny/ask)
- Tool duration tracking

**What to strip**:
- All telemetry/analytics (~50% of code)
- Specific tool type handling (bash, file edit, etc.)
- Session activity tracking, OTel tracing
- Git commit tracking

**CN Mapping**: → `executeWritingSkill()` — the core function that validates, permission-checks, and executes a writing skill

---

## 23. `src/utils/fileHistory.ts` — File History/Snapshots

**What it does**: Tracks file edits by creating backups before writes. Creates message-anchored snapshots. Supports rewind/restore to any snapshot.

**Migrate**: YES (heavily adapted)

**What's useful**:
- `FileHistoryState` type: snapshots array, tracked files set, snapshot sequence counter
- `FileHistorySnapshot` type: messageId, trackedFileBackups, timestamp
- `fileHistoryTrackEdit()` — called before a write to save the previous version
- `fileHistoryMakeSnapshot()` — creates a version snapshot tied to a conversation message
- The backup-before-write pattern with content-hash-based deduplication
- MAX_SNAPSHOTS limit to bound storage

**What to strip**:
- Git-related restore logic
- Session persistence (CN will persist differently)
- Diff stats formatting with chalk

**CN Mapping**: → `ChapterVersionHistory` — version snapshots tied to AI writing operations. Each "continue writing" or "rewrite" operation creates a snapshot. User can rewind to any snapshot point.

---

## 24. `src/utils/fileStateCache.ts` — LRU File Content Cache

**What it does**: LRU cache for file contents with path normalization, size-limited (25MB default).

**Migrate**: YES

**What's useful**:
- The entire `FileStateCache` class — a clean LRU cache for content with path normalization
- Size-based cache eviction (based on content byte length)
- `isPartialView` flag to track whether the cached version matches disk

**CN Mapping**: → `ChapterContentCache` — caching loaded chapter/character sheet content for quick context assembly

---

## 25. `src/query/tokenBudget.ts` — Token Budget Tracking

**What it does**: Tracks output token budget per turn. Decides whether to continue generation or stop based on budget utilization, with diminishing-returns detection.

**Migrate**: YES

**What's useful**:
- `BudgetTracker` type: continuation count, last delta tokens, global turn tokens
- `checkTokenBudget()` — decision function: continue/stop based on budget percentage
- Diminishing returns detection (small deltas after 3+ continuations → stop)
- `COMPLETION_THRESHOLD` (90%) — stop when this close to budget
- Budget continuation message formatting

**CN Mapping**: → Direct use for CN's "long writing" mode. When a user says "write 5000 words", CN needs budget tracking to know when to continue vs stop.

---

## 26. `src/utils/tokenBudget.ts` — Token Budget Parsing

**What it does**: Parses shorthand token budget from user input ("+500k", "use 2M tokens").

**Migrate**: YES (adapted)

**What's useful**:
- `parseTokenBudget()` — regex-based extraction of budget from user text
- Multiplier handling (k/m/b)
- `getBudgetContinuationMessage()` — formatted progress message

**CN Mapping**: → Could adapt for word count targets instead of token counts ("write 3000 words", "+2k words")

---

## 27. `src/utils/modelCost.ts` — Model Cost Configuration

**What it does**: Defines per-model pricing (input/output/cache per Mtok) and `calculateUSDCost()`.

**Migrate**: YES

**What's useful**:
- `ModelCosts` type: inputTokens, outputTokens, promptCacheWriteTokens, promptCacheReadTokens
- Model pricing tiers (COST_TIER_3_15, COST_TIER_15_75, etc.)
- `calculateUSDCost()` function

**CN Mapping**: → Direct use for CN's cost display. Will need to keep pricing updated.

---

## 28. `src/types/permissions.ts` — Permission Type Definitions

**What it does**: Pure type definitions for permission modes, behaviors, and rules.

**Migrate**: PARTIAL

**What's useful**:
- `PermissionMode`: `default`, `acceptEdits`, `plan`, `dontAsk` — maps to CN's safety levels
- `PermissionBehavior`: `allow`, `deny`, `ask` — clean three-state permission model
- Permission rule source tracking

**What to strip**:
- Auto mode, bubble mode
- CLI-specific modes

**CN Mapping**: → `WritingPermissionMode`: `confirm` (always ask before applying AI changes), `autoApply` (apply immediately), `reviewFirst` (show diff first)

---

## 29. `src/coordinator/coordinatorMode.ts` — Coordinator Mode

**What it does**: Multi-agent coordinator that manages worker agents with tool restrictions.

**Migrate**: NO

**Why**: Multi-agent coordination is irrelevant to CN's single-user writing workflow.

---

## 30. `src/services/api/claude.ts` — Anthropic API Client

**What it does**: The core API client that calls Claude: message construction, streaming, model selection, caching, error handling, betas.

**Migrate**: PARTIAL

**What's useful**:
- The pattern of building API request params from: system prompt, messages, tools, thinking config, model selection
- Streaming response handling pattern
- Fallback model logic
- Cache scope management (system prompt caching)

**What to strip**:
- Provider-specific logic (Bedrock, Vertex)
- Agent/coordinator concerns
- Custom fetch overrides, dump prompts

**CN Mapping**: → `callWritingModel()` — CN's API client will be simpler but follows the same param-building and streaming pattern

---

## 31. `src/services/compact/compact.ts` — Conversation Compaction

**What it does**: Summarizes long conversations to fit within context window. Runs a separate API call to generate a summary, then replaces the conversation with boundary + summary.

**Migrate**: PARTIAL (concept only)

**What's useful**:
- The compaction concept: when context is too long, summarize older parts
- `CompactionResult` type: summaryMessages, preCompactTokenCount, postCompactTokenCount
- Post-compact hooks pattern
- The forked-agent compaction pattern (separate API call for summarization)

**CN Mapping**: → When a writing session gets too long, CN should summarize earlier context (previous chapters, earlier edits) to keep the working context within budget.

---

## 32. `src/utils/queryContext.ts` — System Prompt Assembly

**What it does**: Fetches and assembles the three cache-key parts: system prompt, user context, system context.

**Migrate**: PARTIAL (pattern only)

**What's useful**:
- `fetchSystemPromptParts()` — parallel fetching of prompt + user context + system context
- The cache-safe params concept for prompt consistency across compaction boundaries

**CN Mapping**: → `fetchWritingPromptParts()` — parallel assembly of base writing prompt + project context + chapter context

---

## HIGH PRIORITY MIGRATION LIST (by CN architecture need)

### 1. Orchestration Layer
| CC File | CN Component | Priority |
|---------|-------------|----------|
| `query.ts` (async generator pattern) | `writingLoop()` | HIGH |
| `QueryEngine.ts` (session management) | `WritingEngine` | HIGH |
| `utils/queryContext.ts` (prompt assembly) | `fetchWritingContext()` | HIGH |

### 2. Context Management
| CC File | CN Component | Priority |
|---------|-------------|----------|
| `context.ts` (memoized context) | `getProjectContext()` | MEDIUM |
| `services/compact/autoCompact.ts` (thresholds) | `contextBudgetManager` | MEDIUM |
| `utils/fileStateCache.ts` (LRU cache) | `ChapterContentCache` | MEDIUM |
| `services/tokenEstimation.ts` (token counting) | `estimateContextTokens()` | MEDIUM |

### 3. Cost/Token Tracking
| CC File | CN Component | Priority |
|---------|-------------|----------|
| `cost-tracker.ts` (accumulation) | `CostTracker` | HIGH |
| `utils/modelCost.ts` (pricing) | `modelPricing` | HIGH |
| `query/tokenBudget.ts` (budget decisions) | `writingBudgetTracker` | MEDIUM |
| `utils/tokenBudget.ts` (budget parsing) | `parseWordTarget()` | LOW |

### 4. Tool/Skill Abstraction
| CC File | CN Component | Priority |
|---------|-------------|----------|
| `Tool.ts` (type definitions) | `WritingSkill` interface | HIGH |
| `skills/bundledSkills.ts` (registration) | `registerWritingSkill()` | HIGH |
| `skills/loadSkillsDir.ts` (markdown skills) | `loadUserSkills()` | MEDIUM |
| `services/tools/toolOrchestration.ts` (execution) | `executeSkills()` | MEDIUM |
| `services/tools/toolExecution.ts` (lifecycle) | `executeWritingSkill()` | MEDIUM |

### 5. Permission/Safety Model
| CC File | CN Component | Priority |
|---------|-------------|----------|
| `types/permissions.ts` (types) | `WritingPermissions` | MEDIUM |
| `utils/fileHistory.ts` (version snapshots) | `ChapterVersionHistory` | HIGH |
| `schemas/hooks.ts` (hook definitions) | `WritingHooks` | LOW |

### 6. State Management
| CC File | CN Component | Priority |
|---------|-------------|----------|
| `state/store.ts` (reactive store) | Direct adoption | HIGH |
| `state/AppStateStore.ts` (state shape) | `WritingAppState` | MEDIUM |
| `Task.ts` (task state machine) | `WritingTaskStatus` | LOW |
| `commands.ts` (command pattern) | `CommandRegistry` | LOW |

---

## FILES TO DEFINITIVELY SKIP

| Category | Files | Reason |
|----------|-------|--------|
| **CLI/Ink Rendering** | `ink.ts`, `main.tsx`, `replLauncher.tsx`, `dialogLaunchers.tsx`, `interactiveHelpers.tsx` | CN uses Electron |
| **Bridge/Remote** | `bridge/*` | CN is local-first |
| **VIM/Voice** | `vim/*`, `voice/*` | Not needed |
| **Buddy** | `buddy/*` | Companion sprites irrelevant |
| **Git Tools** | `tools/BashTool`, `FileEditTool`, `FileReadTool`, `GlobTool`, `GrepTool` | Code-specific |
| **MCP/Server** | `server/*`, `services/mcp/*` | CN doesn't need MCP |
| **CLI Transports** | `cli/*`, `remote/*` | CN uses IPC |
| **Print/Output** | `outputStyles/*`, `cli/print.ts` | CN renders in Electron |
| **Keybindings** | `keybindings/*` | CN handles its own |
| **Project Onboarding** | `projectOnboardingState.ts` | Code-project specific |
| **History** | `history.ts` | CLI prompt history |
| **Setup** | `setup.ts` | CLI initialization |
| **Coordinator** | `coordinator/*` | Multi-agent irrelevant |
| **Native-TS** | `native-ts/*` | CLI-specific native bindings |

---

## RECOMMENDED MIGRATION ORDER

1. **Phase 1 — Foundation** (Week 1-2)
   - `state/store.ts` → adopt directly
   - `types/permissions.ts` → adapt permission modes
   - `Task.ts` → adapt task status types
   - `utils/modelCost.ts` → adopt pricing definitions

2. **Phase 2 — Cost & Budget** (Week 2-3)
   - `cost-tracker.ts` → adapt accumulation logic
   - `query/tokenBudget.ts` → adapt budget tracking
   - `utils/tokenBudget.ts` → adapt for word targets

3. **Phase 3 — Tool Abstraction** (Week 3-4)
   - `Tool.ts` → define `WritingSkill` interface
   - `skills/bundledSkills.ts` → define skill registration
   - `services/tools/toolExecution.ts` → adapt execution lifecycle

4. **Phase 4 — Orchestration** (Week 4-6)
   - `QueryEngine.ts` → build `WritingEngine`
   - `query.ts` → build `writingLoop()` 
   - `context.ts` → build context assembly
   - `utils/fileHistory.ts` → build version snapshots
   - `services/compact/autoCompact.ts` → build context budget
