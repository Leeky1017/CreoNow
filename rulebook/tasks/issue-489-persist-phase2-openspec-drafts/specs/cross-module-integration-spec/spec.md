## Change: issue-489-persist-phase2-openspec-drafts

### Why

当前工作区存在未持久化的 OpenSpec Phase-2 change 草案，需要通过标准交付链路写入主干，避免规范资产漂移或丢失。

### Requirements

#### Requirement: Current workspace changes are persisted through governed delivery

`task/489-persist-phase2-openspec-drafts` MUST deliver all current OpenSpec draft changes through Rulebook + RUN_LOG + PR auto-merge flow.

##### Scenario: Persist all listed Phase-2 draft changes

- **Given** working tree contains local changes under `openspec/changes/EXECUTION_ORDER.md` and `openspec/changes/p2-*`
- **When** the delivery branch submits PR with auto-merge enabled and required checks passing
- **Then** the changes are merged into `main`
- **And** `openspec/_ops/task_runs/ISSUE-489.md` includes verifiable command evidence and PR link
