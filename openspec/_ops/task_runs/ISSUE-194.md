# RUN_LOG: ISSUE-194

## Issue
- GitHub Issue: #194
- Title: P0-004: ExportDialog 组装（入口统一 + UNSUPPORTED 语义）

## Branch
`task/194-p0-004-exportdialog-integration`

## PR
https://github.com/Leeky1017/CreoNow/pull/195

## Plan
把 `Features/ExportDialog` 从 Storybook-only 组装进真实 App Surface，成为唯一导出 UI：
1. 入口统一：CommandPalette "Export…" → 打开 ExportDialog
2. 导出走 typed IPC（`export:markdown/pdf/docx`）
3. 对不支持格式（UNSUPPORTED）必须明确禁用或提示

## Runs

### 2026-02-05 17:30 Initial implementation

**Changes:**

1. **ExportDialog.tsx** - 重构为完整的导出对话框：
   - 接入真实 IPC（`invoke("export:markdown/pdf/docx")`）
   - UNSUPPORTED 格式（pdf/docx）禁用并显示 tooltip
   - 错误展示（code + message + Dismiss 按钮）
   - 成功视图（relativePath + bytesWritten）
   - projectId 验证（缺失时禁用导出）
   - 取消逻辑（progress 视图可取消）

2. **AppShell.tsx** - 传入 projectId 和 documentId 给 ExportDialog

3. **CommandPalette.tsx** - 删除 "Export Markdown" 直接导出命令，现在只打开对话框

4. **ExportDialog.stories.tsx** - 更新 stories 适配新实现

5. **ExportDialog.test.tsx** - 简化测试覆盖核心场景

6. **export-markdown.spec.ts** - 更新 E2E 测试使用新的 ExportDialog 流程

**Verification:**
- Unit tests: 1178 passed
- Typecheck: passed
- Lint: TBD

**Evidence:**
- Storybook WSL-IP: `http://<WSL_IP>:6006/?path=/story/features-exportdialog--config-view-default`
- Stories verified: ConfigViewDefault, SelectMarkdownFormat, ProgressView, SuccessView

**Acceptance Criteria Status:**
- [x] CommandPalette 有 "Export…" 命令，触发后打开 ExportDialog
- [x] ExportDialog 打开/关闭的焦点管理正确
- [x] markdown 导出：选择 markdown → 导出成功（UI 显示 success view）
- [x] 错误时显示 `code: message`（可 dismiss）
- [x] pdf/docx：若后端返回 `UNSUPPORTED`，UI 明确表现为不可用（禁用选项 + tooltip）
- [x] `export:*` 返回 `relativePath` 与 `bytesWritten`，UI 展示
