# Proposal: a0-04-export-honest-grading

## Why

当前 `document-management` spec 描述 PDF 为「排版后的 PDF 文件」、DOCX 为「Microsoft Word 格式」，但实际实现只是把 `contentText`（纯文本）塞进 PDF / DOCX 容器。没有加粗、斜体、标题层级、图片嵌入。

用户选导出 PDF/DOCX 时，会以为拿到格式完整的文件，实际是纯文本换了个壳。这不是功能缺陷，而是承诺过度。

## What Changes

- 修正 `document-management` spec 中的导出格式描述，明确 PDF/DOCX 当前为纯文本导出
- ExportDialog 中为 PDF/DOCX 增加副标注（"仅纯文本"或"Beta"）
- 导出功能本身不改——富文本导出留给 A2-10

## Scope

- `openspec/specs/document-management/spec.md`
- `apps/desktop/renderer/src/features/export/ExportDialog.tsx`
- `apps/desktop/renderer/src/i18n/locales/en.json` / `zh-CN.json`

## Non-Goals

- 不实现真正的富文本 PDF/DOCX 导出
- 不改变导出后端逻辑
