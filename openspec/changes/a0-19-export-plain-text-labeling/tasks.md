# Tasks: A0-19 Export 纯文本诚实标注

- **GitHub Issue**: #998
- **分支**: `task/998-export-plain-text-labeling`
- **Delta Spec**: `specs/document-management/spec.md`
- **前置依赖**: **A0-04**（导出能力诚实分级）

---

## 所属任务簇

P0-3: 能力诚实分级与假功能处置

---

## 验收标准

| ID | 标准 | 对应 Scenario |
|----|------|--------------|
| AC-1 | ExportDialog 中 PDF 格式选项的 description 显示 `t('export.format.pdfPlainTextHint')`（"纯文本导出 · 不含格式"） | 用户在 ExportDialog 中看到 PDF/DOCX 的能力标注 |
| AC-2 | ExportDialog 中 DOCX 格式选项的 description 显示 `t('export.format.docxPlainTextHint')`（"纯文本导出 · 不含格式"） | 用户在 ExportDialog 中看到 PDF/DOCX 的能力标注 |
| AC-3 | Markdown 和 TXT 格式选项的 description 不变 | 用户在 ExportDialog 中看到 PDF/DOCX 的能力标注 |
| AC-4 | 切换界面语言为英文后，PDF/DOCX description 显示 "Plain text export · no formatting" | i18n 切换后能力标注文案跟随 |
| AC-5 | `zh-CN.json` 和 `en.json` 包含 `export.format.pdfPlainTextHint`、`export.format.docxPlainTextHint`、`export.format.plainTextOnly` 三个 key | i18n 要求 |
| AC-6 | 所有新增文案通过 `t()` 函数获取，无裸字符串字面量 | 全部 Scenario |

---

## Phase 1: Red（测试先行）

### Task 1.1: ExportDialog 格式选项 description 测试

**映射验收标准**: AC-1, AC-2, AC-3

编写 ExportDialog 格式选项能力标注的单元测试：

- [ ] 测试：渲染 ExportDialog，断言 PDF 格式选项的 description 文本包含 `t('export.format.pdfPlainTextHint')` 的值（"纯文本导出 · 不含格式"）
- [ ] 测试：渲染 ExportDialog，断言 DOCX 格式选项的 description 文本包含 `t('export.format.docxPlainTextHint')` 的值（"纯文本导出 · 不含格式"）
- [ ] 测试：渲染 ExportDialog，断言 Markdown 格式选项的 description 文本为 ".md"
- [ ] 测试：渲染 ExportDialog，断言 TXT 格式选项的 description 文本为 ".txt"

**文件**: `apps/desktop/renderer/src/features/export/ExportDialog.test.tsx`（扩展现有文件）

### Task 1.2: i18n 语言切换后标注文案测试

**映射验收标准**: AC-4

- [ ] 测试：在 `en` locale 下渲染 ExportDialog，断言 PDF description 显示 "Plain text export · no formatting"
- [ ] 测试：在 `en` locale 下渲染 ExportDialog，断言 DOCX description 显示 "Plain text export · no formatting"
- [ ] 测试：在 `zh-CN` locale 下渲染 ExportDialog，断言 PDF description 显示 "纯文本导出 · 不含格式"

**文件**: `apps/desktop/renderer/src/features/export/ExportDialog.test.tsx`（扩展现有文件）

### Task 1.3: i18n key 完整性测试

**映射验收标准**: AC-5

- [ ] 测试：`zh-CN.json` 包含 `export.format.pdfPlainTextHint`、`export.format.docxPlainTextHint`、`export.format.plainTextOnly` 三个 key
- [ ] 测试：`en.json` 包含相同的三个 key
- [ ] 测试：中英文文件中 `export.format.*` 命名空间下 key 数量一致

**文件**: `apps/desktop/tests/i18n/export-keys.test.ts`（新建）

---

## Phase 2: Green（实现）

### Task 2.1: 修改 ExportDialog 格式选项 description

实现 PDF/DOCX 格式选项的能力标注：

- [ ] 修改 `getFormatOptions()` 中 PDF 选项的 `description`：从 `t('export.format.pdfDescription')` 改为 `t('export.format.pdfPlainTextHint')`
- [ ] 修改 `getFormatOptions()` 中 DOCX 选项的 `description`：从 `".docx"` 改为 `t('export.format.docxPlainTextHint')`
- [ ] 确认 Markdown 和 TXT 选项不变
- [ ] 所有文案通过 `t()` 函数获取，禁止裸字符串字面量

**文件**: `apps/desktop/renderer/src/features/export/ExportDialog.tsx`（修改 `getFormatOptions` 函数）

### Task 2.2: 新增 i18n key

- [ ] 在 `zh-CN.json` 的 `export.format` 命名空间新增：
  - `"pdfPlainTextHint": "纯文本导出 · 不含格式"`
  - `"docxPlainTextHint": "纯文本导出 · 不含格式"`
  - `"plainTextOnly": "纯文本导出"`
- [ ] 在 `en.json` 的 `export.format` 命名空间新增：
  - `"pdfPlainTextHint": "Plain text export · no formatting"`
  - `"docxPlainTextHint": "Plain text export · no formatting"`
  - `"plainTextOnly": "Plain text only"`
- [ ] 保留原 `pdfDescription` key 不删除（避免其他引用点报错），但 ExportDialog 不再使用

**文件**: `apps/desktop/renderer/src/i18n/locales/zh-CN.json`、`apps/desktop/renderer/src/i18n/locales/en.json`（修改）

---

## Phase 3: Refactor & 视觉验收

### Task 3.1: Storybook 验证

- [ ] 确认 ExportDialog 在 Storybook 中可构建（`pnpm -C apps/desktop storybook:build`）
- [ ] 确认 PDF/DOCX 格式选项的 description 在 Story 中正确显示能力标注文案

### Task 3.2: 清理评估

- [ ] 评估 `ExportDialog.tsx` 中 `UNSUPPORTED_FORMAT_REASONS` 空映射是否应填入 PDF/DOCX 的纯文本说明
- [ ] 若决定使用此机制，将 PDF/DOCX 的纯文本提示迁入映射表

**文件**: `apps/desktop/renderer/src/features/export/ExportDialog.tsx`（可选修改）

---

## 自查清单

| 条目 | 检查项 | 状态 |
|------|--------|------|
| AC-1 PDF 标注 | ExportDialog 中 PDF description 为"纯文本导出 · 不含格式" | [ ] |
| AC-2 DOCX 标注 | ExportDialog 中 DOCX description 为"纯文本导出 · 不含格式" | [ ] |
| AC-3 其他格式不变 | Markdown ".md"、TXT ".txt" 不受影响 | [ ] |
| AC-4 i18n 切换 | 英文下显示 "Plain text export · no formatting" | [ ] |
| AC-5 i18n key | 两个 locale 文件均含新增 key | [ ] |
| AC-6 禁止裸字符串 | ExportDialog 无新增裸字符串字面量 | [ ] |
| 禁止原始色值 | 无新增 Tailwind 原始色值 | [ ] |
| Storybook 可构建 | `storybook:build` 通过 | [ ] |
