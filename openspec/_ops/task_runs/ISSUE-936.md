# RUN_LOG — ISSUE-936: fe-editor-context-menu-and-tooltips

Issue: #936
Branch: `task/936-fe-editor-context-menu`
PR: 待回填
Commit: `76d0b6da`

## Dependency Sync Check

- `fe-editor-advanced-interactions`: 已归档（PR #918 ✓），无漂移
- `fe-hotkeys-shortcuts-unification`: 已归档（PR #931 ✓），无漂移
- 结论：**无漂移**，可进入 Red

## Runs

### Run 1 — Red 阶段

时间：2026-03-03

#### EditorContextMenu 测试（Red）

```
EditorContextMenu.test.tsx: 2 tests FAIL (expected)
- ED-FE-CM-S1: basic actions visible on right-click → FAIL (component not yet created)
- ED-FE-CM-S1b: AI actions disabled without selection → FAIL (component not yet created)
```

#### tooltip-title-guard 测试（Red）

```
tooltip-title-guard.test.ts: 1 test FAIL (expected)
- WB-FE-TT-S1: 17 violations detected across features/**/*.tsx
```

### Run 2 — Green 阶段

```
EditorContextMenu.test.tsx: 2 tests PASS
tooltip-title-guard.test.ts: 1 test PASS (0 violations)
```

### Run 3 — 全量回归

```
Test Files  237 passed (237)
Tests       1714 passed (1714)
Duration    48.81s
```

### Run 4 — TypeCheck

```
pnpm typecheck → 0 errors
```

## Title 迁移统计

- 迁移处数：17（10 feature files）
- 白名单保留：Dialog/ConfirmDialog/PanelContainer/EmptyState/ResultGroup/ErrorGuideCard/AlertDialog（组件 heading prop，非原生 HTML title）
- icon-only buttons: 6 buttons received aria-label for accessibility

## 修改文件清单

### 新增
- `EditorContextMenu.tsx` — Radix ContextMenu 组件
- `EditorContextMenu.test.tsx` — 2 test scenarios
- `tooltip-title-guard.test.ts` — 静态源码扫描 guard

### 修改（Tooltip 迁移）
- `InlineFormatButton.tsx` — title → Tooltip
- `EditorToolbar.tsx` — title → Tooltip
- `WriteButton.tsx` — title → Tooltip
- `DiffHeader.tsx` — title → Tooltip + aria-label
- `OutlinePanel.tsx` — title → Tooltip + aria-label
- `VersionHistoryPanel.tsx` — title → Tooltip
- `AiPanel.tsx` — title → Tooltip
- `SkillPicker.tsx` — title → Tooltip
- `SettingsAppearancePage.tsx` — title → Tooltip
- `EditorPane.tsx` — title → Tooltip + EditorContextMenu 集成

### 测试修复
- `EditorToolbar.test.tsx` — selector: title → aria-label
- `OutlinePanel.test.tsx` — selector: title → aria-label
- `DiffViewPanel.test.tsx` — selector: title → aria-label
- `*.snap` — snapshot 更新（editor + workbench）

## Main Session Audit

待签字
