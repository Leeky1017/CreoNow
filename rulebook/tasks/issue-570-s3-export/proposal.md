# Proposal: issue-570-s3-export

## Why

`s3-export` 变更要求补齐 Markdown/TXT/DOCX 三格式导出能力，并确保失败路径不会退化成静默成功。当前导出链路缺少针对该行为的场景化测试与失败兜底，存在结构语义丢失和 UI 不可见错误风险。

## What Changes

- 新增主进程导出服务场景测试，覆盖 Markdown 与 TXT/DOCX 导出行为。
- 调整导出内容拼装：Markdown/TXT 导出统一包含文档标题与正文结构。
- 在 `ExportDialog` 中补齐 IPC 抛异常兜底，将未处理异常映射为可见 `IO_ERROR`。
- 更新 OpenSpec change tasks 与 RUN_LOG，落盘 Red/Green 证据与依赖同步检查。

## Impact

- Affected specs: `openspec/changes/s3-export/**`
- Affected code:
  - `apps/desktop/main/src/services/export/exportService.ts`
  - `apps/desktop/main/src/services/export/__tests__/export-markdown.test.ts`
  - `apps/desktop/main/src/services/export/__tests__/export-txt-docx.test.ts`
  - `apps/desktop/renderer/src/features/export/ExportDialog.tsx`
  - `apps/desktop/renderer/src/features/export/ExportDialog.test.tsx`
- Breaking change: NO
- User benefit: 导出文件结构更稳定，失败场景可见且不再静默。
