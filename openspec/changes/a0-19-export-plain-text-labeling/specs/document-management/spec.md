# Delta Spec: document-management — Export 纯文本诚实标注

- **Parent Change**: `a0-19-export-plain-text-labeling`
- **Base Spec**: `openspec/specs/document-management/spec.md`
- **GitHub Issue**: #998

---

## 变更摘要

在 ExportDialog 的 PDF/DOCX 格式选项中添加"纯文本导出 · 不含格式"的明确标注，使用户在选择导出格式前即知晓 v0.1 的能力边界。此变更是 A0-04（导出能力诚实分级）的 UI 实施步骤。

---

## 前置依赖

- **A0-04 完成状态**：A0-04 已完成 `document-management/spec.md` 中导出格式表的能力级别校准——本变更以 A0-04 的分级结论为行为依据

---

## 变更: ExportDialog 格式选项能力标注

**替换** ExportDialog 中 PDF 和 DOCX 格式选项的 `description` 字段。

### 格式选项描述（替换原描述）

ExportDialog 中的格式选项**必须**在用户选择前明确展示能力级别：

| 格式 | label | description（替换后） | 替换前 |
|------|-------|----------------------|--------|
| PDF | `"PDF"` | `t('export.format.pdfPlainTextHint')`（"纯文本导出 · 不含格式"） | `t('export.format.pdfDescription')`（"便携文档"） |
| DOCX | `"Word"` | `t('export.format.docxPlainTextHint')`（"纯文本导出 · 不含格式"） | `".docx"` |
| Markdown | `"Markdown"` | `".md"` | 不变 |
| TXT | `t('export.format.plainText')` | `".txt"` | 不变 |

### i18n Key 要求

新增以下 i18n key，`zh-CN.json` 和 `en.json` **必须**同步：

| Key | zh-CN | en |
|-----|-------|----|
| `export.format.pdfPlainTextHint` | 纯文本导出 · 不含格式 | Plain text export · no formatting |
| `export.format.docxPlainTextHint` | 纯文本导出 · 不含格式 | Plain text export · no formatting |
| `export.format.plainTextOnly` | 纯文本导出 | Plain text only |

> 注：原 `export.format.pdfDescription` key 保留不删除（避免潜在引用点报错），但 ExportDialog 不再使用。

### Design Token 引用

| 用途 | Token |
|------|-------|
| 能力标注文字色 | `--color-fg-muted` |
| 能力标注字体 | `--font-family-ui`，12px |

### 约束

- **禁止**在 ExportDialog 中使用裸字符串字面量——所有标注文案通过 `t()` 函数获取
- **禁止**使用 Tailwind 原始色值——样式通过语义化 Design Token 实现
- **禁止**修改 Markdown / TXT 格式选项的 description——这两个格式不在本变更范围内
- **禁止**修改导出后端逻辑——本变更只改 UI 标注，`exportService` 行为不变

---

### Scenario: 用户在 ExportDialog 中看到 PDF/DOCX 的能力标注

- **假设** 用户打开 ExportDialog
- **当** 用户浏览导出格式选项列表
- **则** PDF 格式选项的 description 显示 `t('export.format.pdfPlainTextHint')`（"纯文本导出 · 不含格式"）
- **并且** DOCX 格式选项的 description 显示 `t('export.format.docxPlainTextHint')`（"纯文本导出 · 不含格式"）
- **并且** Markdown 格式选项的 description 保持为 ".md"
- **并且** TXT 格式选项的 description 保持为 ".txt"

### Scenario: i18n 切换后能力标注文案跟随

- **假设** 用户将界面语言切换为英文
- **当** 用户打开 ExportDialog 浏览格式选项
- **则** PDF 的 description 显示 "Plain text export · no formatting"
- **并且** DOCX 的 description 显示 "Plain text export · no formatting"
- **并且** 用户切换回中文后 PDF/DOCX 的 description 显示 "纯文本导出 · 不含格式"

### Scenario: 用户选择 PDF 导出后确认纯文本内容

- **假设** 用户正在编辑一篇包含粗体、斜体、二级标题的文档
- **当** 用户通过 ExportDialog 选择 PDF 格式并确认导出
- **则** 导出的 PDF 文件仅包含正文纯文本
- **并且** 不包含粗体/斜体格式标记
- **并且** 不包含标题层级区分

---

## 可访问性要求

- 能力标注文案**必须**被屏幕阅读器可读——description 文本作为格式选项的辅助描述，通过 `aria-describedby` 或语义化 HTML 结构传达
