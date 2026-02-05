# RUN_LOG: ISSUE-213 — [P1] Frontend Full Assembly: SettingsDialog/Export Enhancements + CommandPalette Fix

## Meta

| Field  | Value                                                                |
| ------ | -------------------------------------------------------------------- |
| Issue  | [#213](https://github.com/Leeky1017/CreoNow/issues/213)              |
| Branch | `task/213-p1-frontend-assembly`                                      |
| PR     | [#214](https://github.com/Leeky1017/CreoNow/pull/214)                |

## Plan

本任务实现 5 个 P1 级前端组装和修复项：

1. **SettingsDialog General Tab** — 集成 Focus Mode、Typewriter Scroll、Smart Punctuation、Auto-Save、Typography、Interface Scale 设置
2. **SettingsDialog Account Tab** — 集成账户设置面板
3. **ExportDialog Plain Text 格式** — 补齐设计稿中缺失的 .txt 导出选项
4. **Export PDF/DOCX/TXT 真支持** — 后端实现 + 前端解禁
5. **CommandPalette E2E flaky fix** — 修复 Windows CI 键盘导航测试的 timing 问题

## Runs

### Run 1 — 2026-02-05

**执行内容**:
1. SettingsDialog 集成：扩展 `SettingsTab` 类型，更新 `navItems`，集成 `SettingsGeneral` 和 `SettingsAccount` 组件
2. ExportDialog 扩展：添加 `txt` 格式到 `ExportFormat` 类型和 UI
3. IPC Contract 更新：添加 `export:txt` channel，运行 `pnpm contract:generate`
4. 后端实现：使用 `pdfkit` 和 `docx` 库实现 `exportPdf`、`exportDocx`、`exportTxt`
5. CommandPalette 修复：添加 `data-active-index` 属性用于 E2E 稳定断言

**验证结果**:
- TypeScript: ✅ 编译通过
- Unit Tests: ✅ 全部通过
- ESLint: ✅ 无新增警告（存在 4 个预先存在的 warnings，非本次改动引入）

**改动文件清单**:
- `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
- `apps/desktop/main/src/ipc/export.ts`
- `apps/desktop/main/src/services/export/exportService.ts`
- `apps/desktop/package.json`
- `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
- `apps/desktop/renderer/src/features/export/ExportDialog.tsx`
- `apps/desktop/renderer/src/features/export/ExportDialog.test.tsx`
- `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`
- `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.stories.tsx`
- `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.test.tsx`
- `apps/desktop/tests/e2e/command-palette.spec.ts`
- `packages/shared/types/ipc-generated.ts`
- `pnpm-lock.yaml`

**状态**: 已完成，待 PR 创建
