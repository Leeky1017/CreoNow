# Document Management Specification Delta

## Change: a0-04-export-honest-grading

### Requirement: 文档导出 [MODIFIED]

系统**必须**支持将文档导出为以下格式：

| 格式     | 扩展名  | 说明                                       |
| -------- | ------- | ------------------------------------------ |
| Markdown | `.md`   | 纯文本 Markdown 格式                       |
| PDF      | `.pdf`  | 纯文本内容导出为 PDF（不含富文本排版）      |
| DOCX     | `.docx` | 纯文本内容导出为 Word（不含富文本排版）     |

PDF 和 DOCX 当前仅导出纯文本正文内容。富文本排版（加粗、斜体、标题层级、图片嵌入等）留作后续版本增强。

用户界面必须在 PDF/DOCX 格式选项旁明确标注当前限制（如"仅纯文本"或"Beta"），确保用户对导出结果有正确预期。

#### Scenario: PDF/DOCX export produces plain-text content [MODIFIED]

- **假设** 用户有一篇含标题、加粗、列表的文档
- **当** 用户选择导出为 PDF
- **则** 生成的 PDF 包含纯文本正文，不含富文本格式
- **并且** ExportDialog 在 PDF 选项旁显示"仅纯文本"标注
