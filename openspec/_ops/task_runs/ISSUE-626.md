# ISSUE-626

## Links

- Issue: #626
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/626
- Branch: `task/626-phase-3-quality-uplift`
- PR: 未创建（创建后回填真实 pull URL，再进入 preflight/合并流程）

## Scope

- Rulebook task: `rulebook/tasks/issue-626-phase-3-quality-uplift/**`
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-626.md`
- Active change: `openspec/changes/issue-606-phase-3-quality-uplift/**`
- Required checks: `ci`, `openspec-log-guard`, `merge-serial`

## Specification

- 已阅读 `openspec/project.md`、`openspec/specs/workbench/spec.md`、`openspec/specs/editor/spec.md`、`docs/delivery-skill.md`。
- 已对齐本任务为 Phase 3 “quality uplift”治理前置：仅做质量与一致性收口，不新增业务功能。
- 已确认 change 任务入口为 `openspec/changes/issue-606-phase-3-quality-uplift/`，交付 issue 入口为 OPEN Issue `#626`。

## TDD Mapping References

- Scenario→测试映射主表：`openspec/changes/issue-606-phase-3-quality-uplift/tasks.md`
- Workbench Scenario refs:
  - `WB-SCROLL-01`, `WB-SCROLL-02`
  - `WB-MOTION-01`, `WB-MOTION-02`
  - `WB-A11Y-01`, `WB-A11Y-02`
  - `WB-TEST-01`
- Editor Scenario refs:
  - `ED-TYPO-01`, `ED-TYPO-02`
  - `ED-SCROLL-01`, `ED-SCROLL-02`
  - `ED-MOTION-01`, `ED-MOTION-02`
  - `ED-A11Y-01`, `ED-TEST-01`
- Mapping rule:
  - 每个 Scenario ID 至少映射一个测试用例。
  - 未记录 Red 失败证据前，不进入 Green。

## Dependency Sync Check

- Inputs reviewed:
  - `openspec/changes/issue-606-phase-3-quality-uplift/proposal.md`
  - `openspec/changes/issue-606-phase-3-quality-uplift/tasks.md`
  - `openspec/changes/issue-606-phase-3-quality-uplift/specs/workbench/spec.md`
  - `openspec/changes/issue-606-phase-3-quality-uplift/specs/editor/spec.md`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/specs/workbench/spec.md`
  - `openspec/specs/editor/spec.md`
- Result: `NO_DRIFT`
- Notes:
  - 依赖同步结论与 change proposal 中记录一致。
  - 若上游 spec/token baseline 在实现中发生变化，先更新 proposal/spec/tasks（必要时同步 `EXECUTION_ORDER.md`）再继续 Red/Green。

## Runs

### 2026-02-23 Specification + Change Review

- Command:
  - `sed -n '1,220p' openspec/project.md`
  - `sed -n '1,260p' openspec/changes/issue-606-phase-3-quality-uplift/proposal.md`
  - `sed -n '1,240p' openspec/changes/issue-606-phase-3-quality-uplift/tasks.md`
  - `sed -n '1,260p' openspec/changes/issue-606-phase-3-quality-uplift/specs/workbench/spec.md`
  - `sed -n '1,260p' openspec/changes/issue-606-phase-3-quality-uplift/specs/editor/spec.md`
  - `sed -n '1,220p' openspec/specs/workbench/spec.md`
  - `sed -n '1,220p' openspec/specs/editor/spec.md`
  - `sed -n '1,260p' docs/delivery-skill.md`
- Exit code: `0`
- Key output:
  - 确认 change 包含 Workbench + Editor 的 Phase 3 提质场景，并在 `tasks.md` 中已有 Scenario→测试映射总表。
  - 依赖同步检查在 proposal 中记录为 `NO_DRIFT`，与当前输入一致。

### 2026-02-23 Rulebook Task Create

- Command:
  - `rulebook task create issue-626-phase-3-quality-uplift`
- Exit code: `0`
- Key output:
  - `✅ Task issue-626-phase-3-quality-uplift created successfully`
  - `Location: rulebook/tasks/issue-626-phase-3-quality-uplift/`

### 2026-02-23 Rulebook Task Authoring (governance scaffold)

- Action:
  - 完成 `rulebook/tasks/issue-626-phase-3-quality-uplift/proposal.md` 与 `tasks.md` 的治理化改写。
  - 更新 `.metadata.json` 状态为 `in_progress`。
- Result: `DONE`

### 2026-02-23 Rulebook Validate + Timestamp Gate

- Command:
  - `rulebook task validate issue-626-phase-3-quality-uplift`
  - `python3 scripts/check_doc_timestamps.py --files rulebook/tasks/issue-626-phase-3-quality-uplift/proposal.md rulebook/tasks/issue-626-phase-3-quality-uplift/tasks.md`
- Exit code:
  - `validate`: `0`
  - `timestamp gate`: `0`
- Key output:
  - `✅ Task issue-626-phase-3-quality-uplift is valid`
  - warning: `No spec files found (specs/*/spec.md)`
  - `OK: validated timestamps for 2 governed markdown file(s)`

### 2026-02-23 Final Governance Verification (before handoff)

- Command:
  - `rulebook task validate issue-626-phase-3-quality-uplift`
  - `python3 scripts/check_doc_timestamps.py --files rulebook/tasks/issue-626-phase-3-quality-uplift/proposal.md rulebook/tasks/issue-626-phase-3-quality-uplift/tasks.md`
- Exit code: `0`
- Key output:
  - `✅ Task issue-626-phase-3-quality-uplift is valid`
  - warning: `No spec files found (specs/*/spec.md)`
  - `OK: validated timestamps for 2 governed markdown file(s)`
  - 已人工复核 ISSUE-626 PR 字段，不使用占位词

### 2026-02-23 Editor Phase-3 Red Evidence (ED-TYPO/TEST)

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/editor-typography.contract.test.ts renderer/src/features/editor/editor-motion.contract.test.ts renderer/src/features/outline/OutlinePanel.test.tsx renderer/src/features/diff/DiffView.test.tsx renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/editor/editor.stories.snapshot.test.ts`
- Exit code: `1`
- Key output:
  - `editor-typography.contract.test.ts`: `3 failed`（缺少 `--text-editor-line-height-cjk` 断言命中、`EditorPane` 未命中 typography helper）
  - `editor.stories.snapshot.test.ts`: `1 failed`（toolbar 过渡类新增 `motion-reduce:transition-none` 导致快照漂移）
  - 其余场景绿灯：`editor-motion.contract`, `OutlinePanel`, `DiffView`, `EditorToolbar`。

### 2026-02-23 Editor Phase-3 Green Verification

- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/features/editor/EditorPane.test.tsx renderer/src/features/editor/editor-typography.contract.test.ts renderer/src/features/editor/editor-motion.contract.test.ts renderer/src/features/outline/OutlinePanel.test.tsx renderer/src/features/diff/DiffView.test.tsx renderer/src/features/editor/EditorToolbar.test.tsx renderer/src/features/editor/editor.stories.snapshot.test.ts`
- Exit code: `0`
- Key output:
  - `Test Files 7 passed (7)`
  - `Tests 78 passed (78)`
  - 场景覆盖：`ED-TYPO-01/02`, `ED-SCROLL-01/02`, `ED-MOTION-01/02`, `ED-A11Y-01`, `ED-TEST-01`。

### 2026-02-23 Editor Phase-3 touched files (this teammate)

- `apps/desktop/renderer/src/features/editor/EditorToolbar.test.tsx`
- 变更点：
  - 为键盘路径测试补齐场景标识：`[ED-A11Y-01]`，确保 Scenario→测试映射可追踪。

### TEMPLATE: <YYYY-MM-DD Run Title>

- Command:
  - `<command>`
- Exit code: `<code>`
- Key output:
  - `<key output>`
- Note:
  - `<why this run matters>`
