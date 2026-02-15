## 1. Specification

- [x] 1.1 审阅并确认 `s3-export` 边界：补齐 Markdown/TXT/DOCX 导出，不扩展新格式。
- [x] 1.2 审阅并确认 `export:*` 既有契约与错误语义保持稳定。
- [x] 1.3 审阅并确认验收阈值：三种导出成功可验证、失败路径显式可见。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，标注 `N/A`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [x] S3-EXPORT-S1 `文档可导出为 Markdown 且内容正确 [MODIFIED]`
  - 测试文件：`apps/desktop/main/src/services/export/__tests__/export-markdown.test.ts`
  - 测试名：`"should export markdown with title heading + paragraph structure"`
- [x] S3-EXPORT-S2 `文档可导出为 TXT 与 DOCX [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/export/__tests__/export-txt-docx.test.ts`
  - 测试名：`"should export txt/docx as deterministic artifacts with semantic title+content"`
- [x] S3-EXPORT-S3 `导出失败返回显式错误并反馈 UI [ADDED]`
  - 测试文件：`apps/desktop/renderer/src/features/export/ExportDialog.test.tsx`
  - 测试名：`"shows explicit error and avoids success state when export IPC throws"`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-EXPORT-S1 失败测试，确认 Markdown 导出未包含标题结构。
- [x] 3.2 编写 S3-EXPORT-S2 失败测试，确认 TXT 导出未包含标题语义。
- [x] 3.3 编写 S3-EXPORT-S3 失败测试，确认 IPC 抛异常时 UI 存在未处理失败。

## 4. Green（最小实现通过）

- [x] 4.1 在 exportService 中补齐 Markdown 导出标题+正文最小实现并通过 S3-EXPORT-S1。
- [x] 4.2 补齐 TXT 导出标题语义、保持 DOCX 产物有效并通过 S3-EXPORT-S2。
- [x] 4.3 打通 `invoke` 抛异常时的错误回传与 UI 反馈链路并通过 S3-EXPORT-S3。

## 5. Refactor（保持绿灯）

- [x] 5.1 去重 Markdown/TXT 导出共享拼装流程，避免格式逻辑分叉。
- [x] 5.2 复核错误映射一致性，统一为可见 `IO_ERROR` 提示。

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。
