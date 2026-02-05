# Design 01 — Delta Map（审评报告 → 本 spec 任务卡映射）

> Spec: `../spec.md`
>
> Input (non-SSOT): `/home/leeky/.cursor/plans/creonow_mvp审评报告_1a7946f4.plan.md`

本文件的目标：把审评报告的 **todos + 关键代码指针**，映射为本 spec 的任务卡；并显式关联到上游 `creonow-frontend-full-assembly` 的任务卡，避免重复/漂移。

## 1) P0/P1/P2 映射表（SSOT）

| 审评 todo id | 优先级 | 本 spec 任务卡 | 上游关联（如有） | 关键代码指针（报告给出） |
| --- | --- | --- | --- | --- |
| `p0-005-dashboard` | P0 阻塞 | `task_cards/p0/P0-001-dashboard-project-actions-rename-duplicate-archive.md` | `creonow-frontend-full-assembly/task_cards/p0/P0-005-dashboard-project-actions-and-templates.md` | `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx:397` |
| `p0-007-preview` | P0 小修 | `task_cards/p0/P0-002-version-history-preview-dialog.md` | `creonow-frontend-full-assembly/task_cards/p0/P0-007-version-history-compare-diff-restore.md` | `apps/desktop/renderer/src/features/version-history/VersionHistoryContainer.tsx:269` |
| `p0-012-restore-confirm` | P0 小修 | `task_cards/p0/P0-003-version-restore-confirmation-systemdialog.md` | `creonow-frontend-full-assembly/task_cards/p0/P0-012-aidialogs-systemdialog-and-confirm-unification.md` | `apps/desktop/renderer/src/components/layout/AppShell.tsx:412` + `.../VersionHistoryContainer.tsx:254` |
| `error-boundary` | P0 基础 | `task_cards/p0/P0-004-react-error-boundary.md` | — | — |
| `test-ci` | P0 基础 | `task_cards/p0/P0-005-ci-run-desktop-vitest.md` | — | `.github/workflows/ci.yml` |
| `p0-013-history` | P1 | `task_cards/p1/P1-001-ai-history-real-data.md` | `creonow-frontend-full-assembly/task_cards/p0/P0-013-ai-surface-assembly-and-observability.md` | `apps/desktop/renderer/src/features/ai/ChatHistory.tsx:23` + `apps/desktop/renderer/src/features/ai/AiPanel.tsx:474` |
| `service-tests` | P1 | `task_cards/p1/P1-002-core-services-unit-tests.md` | — | `apps/desktop/main/src/services/**` |
| `store-tests` | P1 | `task_cards/p1/P1-003-core-stores-tests.md` | — | `apps/desktop/renderer/src/stores/**` |
| `api-key-encrypt` | P1 安全 | `task_cards/p1/P1-004-keytar-secure-api-key-storage.md` | — | `apps/desktop/main/src/services/ai/aiProxySettingsService.ts:201` |
| `xss-fix` | P1 安全 | `task_cards/p1/P1-005-xss-hardening-sanitize-html.md` | — | `apps/desktop/renderer/src/features/editor/EditorToolbar.stories.tsx:51` |
| `state-redundancy` | P1 架构 | `task_cards/p1/P1-006-state-ssot-remove-project-document-id-redundancy.md` | — | `apps/desktop/renderer/src/stores/*` |
| `ai-retry` | P1 功能 | `task_cards/p1/P1-007-ai-retry-backoff.md` | — | `apps/desktop/main/src/services/ai/aiService.ts`（多个 fetch） |
| `react-memo` | P2 性能 | `task_cards/p2/P2-001-react-memo-list-items.md` | — | `OutlinePanel.tsx:383`、`CharacterCard.tsx`、`VersionHistoryPanel.tsx:454`、`FileTreePanel.tsx:191` |
| `virtualization` | P2 性能 | `task_cards/p2/P2-002-virtualize-large-lists.md` | — | Outline/VersionHistory/CommandPalette/SearchPanel |
| `zustand-shallow` | P2 性能 | `task_cards/p2/P2-003-zustand-useShallow-audit.md` | — | `apps/desktop/renderer/src/stores/**` |
| `console-cleanup` | P2 代码 | `task_cards/p2/P2-004-console-cleanup-and-logger.md` | — | `rg \"console\\.\" apps/desktop/{renderer,main}/src` |
| `hardcoded-strings` | P2 代码 | `task_cards/p2/P2-005-ui-strings-constants.md` | — | `rg '\"[A-Za-z].+\"' apps/desktop/renderer/src`（执行时以规则过滤） |

## 2) 上游 P0 完成度（审评快照，仅作背景）

审评报告对 `creonow-frontend-full-assembly` 的 P0 任务核验快照（截至 2026-02-05）：

- 10/14 完成
- 3/14 部分完成（P0-007 / P0-012 / P0-013）
- 1/14 未完成（P0-005）

本 spec 只覆盖“未完成/部分完成的缺口 + 审评新增的基础门禁与加固项”，不重复描述已完成项。

