# A0-04 导出能力诚实分级

- **GitHub Issue**: #1002
- **所属任务簇**: P0-3（能力诚实分级与假功能处置）
- **涉及模块**: document-management
- **前端验收**: 需要

---

## Why：为什么必须做

### 1. 用户现象

用户在 ExportDialog 中选择 PDF 或 DOCX 导出时，自然期望保留文档中的粗体、斜体、标题层级、图片等富文本格式——毕竟 PDF 和 Word 本身就是格式化文档的代名词。然而实际导出的文件仅含纯文本，所有格式信息被静默丢弃。用户打开导出文件后发现"一马平川"，与编辑器中所见截然不同。这是典型的"口惠而实不至"——承诺了锦绣文章，交付的是白纸黑字。

### 2. 根因

Spec 与实现之间存在系统性不一致：

- **Spec 承诺过高**：`openspec/specs/document-management/spec.md` 中导出 Requirement 的格式表将 PDF 描述为"排版后的 PDF 文件"、DOCX 描述为"Microsoft Word 格式"，暗示支持格式化输出
- **实现仅支持纯文本**：
  - PDF 导出使用 `contentText` 纯文本，Helvetica 12pt 单一字体，无富文本解析、无图片嵌入
  - DOCX 导出按行拆分为 `Paragraph` + `TextRun`，不解析 TipTap JSON 格式信息、无图片、无表格
- **UI 无能力标注**：`ExportDialog.tsx` 的 PDF 选项描述仅为 `t('export.format.pdfDescription')`（"便携文档"），DOCX 描述仅为 ".docx"——均无任何暗示实际是纯文本导出
- **`UNSUPPORTED_FORMAT_REASONS` 映射为空**：代码中预留了格式不支持提示机制，但映射表为空，所有格式标记为"已支持"

### 3. v0.1 威胁

- **信任损耗**：用户以为能导出格式化文档，实际打开后全是纯文本——一次受骗，十次怀疑。创作工具的导出是用户"交卷"的时刻，此处失信代价极高
- **Spec 债务蔓延**：如果 spec 在 v0.1 不校准，后续开发 Agent 会基于错误承诺做排期和实现——"差之毫厘，缪以千里"
- **竞品对比劣势**：主流创作工具（Scrivener、Typora）的 PDF/DOCX 导出至少保留基本格式，CreoNow 若不标注能力级别会被视为 bug 而非 feature gap

### 4. 证据来源

| 文档 | 章节 | 内容 |
|------|------|------|
| `docs/audit/amp/01-master-roadmap.md` | §4.2 可信度必修项 | PDF/DOCX 导出能力与 spec 承诺不一致 |
| `docs/audit/amp/08-backend-module-health-audit.md` | §四 导出模块健康度 | "PDF: uses `contentText` only, Helvetica 12pt, no rich text/images；DOCX: splits by line into Paragraph + TextRun, no format/images/tables" |
| `docs/audit/amp/08-backend-module-health-audit.md` | §4.5 导出概况表 | "PDF/DOCX 导出：ExportDialog 展示四种格式，全部仅导出纯文本" |
| `openspec/specs/document-management/spec.md` | Requirement: 文档导出 | PDF 描述为"排版后的 PDF 文件"、DOCX 描述为"Microsoft Word 格式"——暗示格式化能力 |
| `ExportDialog.tsx` | L126-155 | `getFormatOptions()` 中 PDF description 为 `t('export.format.pdfDescription')`（"便携文档"），DOCX description 为 ".docx"，无纯文本提示；`UNSUPPORTED_FORMAT_REASONS` 为空映射 |

---

## What：做什么

1. **修正 document-management spec 中导出格式表**：明确 PDF/DOCX 在 v0.1 为纯文本导出，正文不保留格式信息（粗体、斜体、标题层级、图片、表格）；Markdown 导出保留格式
2. **ExportDialog PDF/DOCX 选项添加能力标注**：在 PDF 和 DOCX 格式选项的 description 中添加 `t('export.format.plainTextOnly')`（"纯文本导出"）标注，让用户在选择前即知晓能力边界
3. **补充 i18n key**：`zh-CN.json` 和 `en.json` 新增 `export.format.plainTextOnly`、`export.format.pdfPlainTextHint`、`export.format.docxPlainTextHint` 等 key
4. **补充 Scenario**：新增导出格式选择时能力标注可见、导出 PDF 后内容为纯文本的行为场景

---

## Non-Goals：不做什么

1. **不实现 PDF/DOCX 富文本导出**——v0.1 不投入 TipTap JSON → 富文本解析的工程量；格式化导出属于 v0.2+ 路线图范畴
2. **不修改导出后端逻辑**——本任务仅校准 spec 与 UI 标注，不改变 `exportService` 的输出行为
3. **不新增导出格式（如 EPUB、HTML）**——格式扩展不在 v0.1 范围内
4. **不修改 Markdown 导出行为**——Markdown 导出已正确转换 TipTap JSON 格式，不在本次校准范围
5. **不为 PDF/DOCX 添加 disabled 或移除入口**——用户仍可导出纯文本 PDF/DOCX，只是需要被诚实告知能力边界

---

## 依赖与影响

- **上游依赖**: 无——本任务是 P0-3 任务簇中的规范基线，不依赖其他 A0 任务
- **被依赖于**: A0-19（Export 纯文本诚实标注）——A0-19 以本任务的 spec 修正和分级结论为前提
- **受益于**: A0-06（发布事实表）——导出能力分级结论可直接纳入发布事实表
