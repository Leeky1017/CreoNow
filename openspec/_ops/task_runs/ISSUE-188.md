# ISSUE-188

- Issue: #188
- Branch: task/188-p0-002-command-palette
- PR: https://github.com/Leeky1017/CreoNow/pull/189

## Plan

- 补齐 CommandPalette 命令（Settings/Export/Toggle Panels/Zen Mode/New Doc/New Project）
- 对齐快捷键到 design/DESIGN_DECISIONS.md（修复 Cmd+B → Cmd+\）
- 新增 E2E 测试 command-palette.spec.ts

## Runs

### 2026-02-05 12:10 Initial Implementation

- Files changed:
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/tests/e2e/command-palette.spec.ts` (new)

- Command: `pnpm tsc --noEmit`
- Key output: `Exit code: 0` (no type errors)

- Command: `pnpm lint`
- Key output: `✖ 3 problems (0 errors, 3 warnings)` (pre-existing warnings only)

- Command: `pnpm vitest run CommandPalette.test.tsx AppShell.test.tsx`
- Key output: `Test Files  2 passed (2), Tests  44 passed (44)`

### Implementation Summary

**CommandPalette.tsx changes:**
- Fixed Toggle Sidebar shortcut: `⌘B` → `⌘\` (per DESIGN_DECISIONS.md)
- Added commands: Toggle Right Panel, Toggle Zen Mode, Export…, Create New Project
- Added platform-aware shortcut display (⌘ on Mac, Ctrl+ on Windows)
- Added callback props for layout/dialog/document actions
- Added error handling with `error.code: message` format

**AppShell.tsx changes:**
- Added keyboard shortcuts: `Cmd/Ctrl+,` (Settings), `Cmd/Ctrl+N` (New Doc), `Cmd/Ctrl+Shift+N` (New Project)
- Added dialog state management and rendering (SettingsDialog, ExportDialog, CreateProjectDialog)
- Created callback objects for CommandPalette

**New E2E test:**
- `command-palette.spec.ts` covering all shortcuts and command execution
