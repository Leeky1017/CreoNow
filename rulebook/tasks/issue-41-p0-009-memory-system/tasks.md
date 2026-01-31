## 1. Implementation

- [x] 1.1 Update SQLite schema (user_memory/settings/skill_feedback)
- [x] 1.2 Implement `MemoryService` (CRUD + deterministic sort + injection preview)
- [x] 1.3 Implement preference learning (noise filter + threshold trigger)
- [x] 1.4 Add `memory:*` IPC handlers + register in main process
- [x] 1.5 Update `ai:skill:run` injection + `ai:skill:feedback` persistence/learning

## 2. Testing

- [x] 2.1 Unit: preference learning noise + threshold
- [x] 2.2 E2E (Windows): injection + feedback → learned preference + disable injection

## 3. Documentation

- [x] 3.1 Add RUN_LOG: `openspec/_ops/task_runs/ISSUE-41.md`
