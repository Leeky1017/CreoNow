# P1-002: Analytics & Writing Stats（统计与看板）

Status: done

## Goal

落地 `11-analytics.html` 的最小可用：统计写作字数、写作时长（可粗略）、skills 使用次数、文档创建数，并提供按日/区间查询的 IPC 通道与 UI 展示。

## Dependencies

- Design: `../../../design/DESIGN_DECISIONS.md`（designs 清单包含 analytics）
- P0-004: `../p0/P0-004-sqlite-bootstrap-migrations-logs.md`
- P0-005: `../p0/P0-005-editor-ssot-autosave-versioning.md`
- P0-006: `../p0/P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md`

## Expected File Changes

| 操作   | 文件路径                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------- |
| Update | `apps/desktop/main/src/db/migrations/*.sql`（stats 表）                                            |
| Add    | `apps/desktop/main/src/ipc/stats.ts`（`stats:*` channels）                                         |
| Add    | `apps/desktop/main/src/services/stats/statsService.ts`                                             |
| Add    | `apps/desktop/renderer/src/features/analytics/AnalyticsPage.tsx`（`data-testid="analytics-page"`） |
| Add    | `apps/desktop/tests/e2e/analytics.spec.ts`                                                         |

## Acceptance Criteria

- [x] `stats:getToday` / `stats:getRange` 返回稳定结构（包含 summary）
- [x] 编辑器输入与保存会更新统计（字数至少可测）
- [x] 运行 skill 会更新 `skillsUsed`
- [x] Analytics 页面可展示今日/区间统计（最小）

## Tests

- [x] E2E（Windows）：
  - [x] 创建文档并输入 → 统计字数增长
  - [x] 运行 skill → skillsUsed 增长

## Edge cases & Failure modes

- DB 错误 → `DB_ERROR`；UI 可恢复

## Observability

- `main.log`：`stats_increment`（date + increments）

## Completion

- Issue: #54
- PR: <fill-after-created>
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-54.md`
