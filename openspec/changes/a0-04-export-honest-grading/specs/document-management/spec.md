# Delta Spec: document-management — 导出能力诚实分级

- **Parent Change**: `a0-04-export-honest-grading`
- **Base Spec**: `openspec/specs/document-management/spec.md`
- **GitHub Issue**: #1002

---

## 变更: Requirement「文档导出」— 格式能力分级

**替换** Base Spec 中「文档导出」Requirement 的导出格式表及相关描述。

### 导出格式表（替换原表）

系统**必须**支持将文档导出为以下格式——每种格式有明确的能力级别：

| 格式 | 扩展名 | 能力级别（v0.1） | 说明 |
|------|--------|-----------------|------|
| Markdown | `.md` | **格式化** | 完整转换 TipTap JSON 为 Markdown 语法，保留标题层级、粗体、斜体、列表等格式 |
| PDF | `.pdf` | **纯文本** | 仅导出正文纯文本（`contentText`），Helvetica 12pt，不保留粗体/斜体/标题层级/图片/表格 |
| DOCX | `.docx` | **纯文本** | 按行拆分为 Paragraph + TextRun，不解析格式信息，不嵌入图片/表格 |
| TXT | `.txt` | **纯文本** | 纯文本输出 |

> **v0.2 路线图预告**：PDF/DOCX 格式化导出（支持标题层级、粗体/斜体、图片嵌入、表格）计划在 v0.2 实现。v0.1 阶段 PDF/DOCX 仅支持纯文本导出。

### ExportDialog 格式选项能力标注

ExportDialog 中的格式选项**必须**在用户选择前明确展示能力级别——用户不应在导出完成后才发现格式丢失。

格式选项的 `description` 字段**必须**遵循以下规则：

| 格式 | label | description | 备注 |
|------|-------|-------------|------|
| PDF | `"PDF"` | `t('export.format.pdfPlainTextHint')`（"纯文本导出 · 不含格式"） | 替代原"便携文档" |
| Markdown | `"Markdown"` | `".md"` | 保持不变 |
| DOCX | `"Word"` | `t('export.format.docxPlainTextHint')`（"纯文本导出 · 不含格式"） | 替代原 ".docx" |
| TXT | `t('export.format.plainText')` | `".txt"` | 保持不变 |

### Design Token 引用

| 用途 | Token |
|------|-------|
| 能力标注文字色 | `--color-fg-muted` |
| 能力标注字体 | `--font-family-ui`，12px |

### i18n Key 要求

新增以下 i18n key，`zh-CN.json` 和 `en.json` **必须**同步：

| Key | zh-CN | en |
|-----|-------|----|
| `export.format.pdfPlainTextHint` | 纯文本导出 · 不含格式 | Plain text export · no formatting |
| `export.format.docxPlainTextHint` | 纯文本导出 · 不含格式 | Plain text export · no formatting |
| `export.format.plainTextOnly` | 纯文本导出 | Plain text only |

---

#### Scenario: 用户在 ExportDialog 中看到 PDF/DOCX 的能力标注

- **假设** 用户打开 ExportDialog
- **当** 用户浏览导出格式选项列表
- **则** PDF 格式选项的 description 显示 `t('export.format.pdfPlainTextHint')`（"纯文本导出 · 不含格式"）
- **并且** DOCX 格式选项的 description 显示 `t('export.format.docxPlainTextHint')`（"纯文本导出 · 不含格式"）
- **并且** Markdown 格式选项的 description 保持为 ".md"
- **并且** TXT 格式选项的 description 保持为 ".txt"

#### Scenario: 用户选择 PDF 导出后获得纯文本内容

- **假设** 用户正在编辑一篇包含粗体、斜体、二级标题的文档「第一章」
- **当** 用户通过 ExportDialog 选择 PDF 格式并确认导出
- **则** 系统通过 `export:document` 导出的 PDF 文件仅包含正文纯文本
- **并且** 不包含粗体/斜体格式标记
- **并且** 不包含标题层级区分（全文统一 Helvetica 12pt）
- **并且** 不包含图片

#### Scenario: 用户选择 Markdown 导出保留格式

- **假设** 用户正在编辑一篇包含粗体、斜体、二级标题的文档「第一章」
- **当** 用户通过 ExportDialog 选择 Markdown 格式并确认导出
- **则** 系统导出的 `.md` 文件保留标题层级（`##`）、粗体（`**text**`）、斜体（`*text*`）等 Markdown 格式语法

#### Scenario: i18n 切换后能力标注文案跟随

- **假设** 用户将界面语言切换为英文
- **当** 用户打开 ExportDialog 浏览格式选项
- **则** PDF 的 description 显示 "Plain text export · no formatting"
- **并且** DOCX 的 description 显示 "Plain text export · no formatting"
