# Proposal: issue-190-p0-012-systemdialog-confirm

## Why

P0-012 要求把 destructive 操作从 `window.confirm` 收敛到 `SystemDialog`，确保一致的焦点/键盘交互与可断言的 E2E 行为；同时 AI Surface 的错误态需要统一到 `AiErrorCard`，避免分散的 error box 与 silent failure。

## What Changes

- Renderer：新增 `useConfirmDialog()`（promise-based confirm），统一驱动 `SystemDialog`。
- Renderer：替换 Files/KG/Dashboard 的 destructive confirm 入口为 `SystemDialog`（包含 KG relation delete）。
- Renderer：AiPanel 错误态改为渲染 `AiErrorCard`，并保持稳定选择器 `ai-error-code`。
- Components：`SystemDialog` 默认 `simulateDelay` 调整为 `0`（生产路径不模拟延迟）。
- Tests：更新 Playwright E2E（documents-filetree / knowledge-graph）从原生 dialog 改为点击 `SystemDialog`；新增 `system-dialog.spec.ts` 覆盖 Cancel/Confirm + 两个入口。

## Impact

- Affected specs:
  - openspec/specs/creonow-frontend-full-assembly/spec.md#cnfa-req-003
  - openspec/specs/creonow-frontend-full-assembly/task_cards/p0/P0-012-aidialogs-systemdialog-and-confirm-unification.md
- Affected code:
  - apps/desktop/renderer/src/hooks/useConfirmDialog.ts
  - apps/desktop/renderer/src/features/files/FileTreePanel.tsx
  - apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx
  - apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx
  - apps/desktop/renderer/src/features/ai/AiPanel.tsx
  - apps/desktop/renderer/src/components/features/AiDialogs/\*
  - apps/desktop/tests/e2e/system-dialog.spec.ts
  - apps/desktop/tests/e2e/documents-filetree.spec.ts
  - apps/desktop/tests/e2e/knowledge-graph.spec.ts
- Breaking change: NO
- User benefit: destructive 操作确认弹窗一致且可预期；AI 错误态统一并保留稳定错误码展示，提升可观测性与 E2E 稳定性。
