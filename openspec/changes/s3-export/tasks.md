## 1. Specification

- [ ] 1.1 审阅并确认 `s3-export` 边界：补齐 Markdown/TXT/DOCX 导出，不扩展新格式。
- [ ] 1.2 审阅并确认 `export:*` 既有契约与错误语义保持稳定。
- [ ] 1.3 审阅并确认验收阈值：三种导出成功可验证、失败路径显式可见。
- [ ] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（本 change 无上游依赖，标注 `N/A`）。

## 2. TDD Mapping（先测前提）

- [ ] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [ ] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系。
- [ ] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [ ] S3-EXPORT-S1 `文档可导出为 Markdown 且内容正确 [MODIFIED]`
  - 测试文件：`apps/desktop/main/src/services/export/__tests__/export-markdown.test.ts`
  - 测试名：`"exports markdown with expected heading/body structure"`
- [ ] S3-EXPORT-S2 `文档可导出为 TXT 与 DOCX [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/export/__tests__/export-txt-docx.test.ts`
  - 测试名：`"exports txt and docx with deterministic output artifacts"`
- [ ] S3-EXPORT-S3 `导出失败返回显式错误并反馈 UI [ADDED]`
  - 测试文件：`apps/desktop/tests/integration/export/export-error-visibility.test.ts`
  - 测试名：`"propagates export failure without silent fallback"`

## 3. Red（先写失败测试）

- [ ] 3.1 编写 S3-EXPORT-S1 失败测试，确认 Markdown 导出尚未满足内容断言。
- [ ] 3.2 编写 S3-EXPORT-S2 失败测试，确认 TXT/DOCX 路径尚未完整实现。
- [ ] 3.3 编写 S3-EXPORT-S3 失败测试，确认失败路径存在静默风险。

## 4. Green（最小实现通过）

- [ ] 4.1 在 exportService 中补齐 Markdown 导出最小实现并通过 S3-EXPORT-S1。
- [ ] 4.2 补齐 TXT/DOCX 导出实现并通过 S3-EXPORT-S2。
- [ ] 4.3 打通失败错误回传与 UI 反馈链路并通过 S3-EXPORT-S3。

## 5. Refactor（保持绿灯）

- [ ] 5.1 去重三种导出格式共享流程，避免复制分叉。
- [ ] 5.2 复核错误映射一致性，保持文档管理模块风格一致。

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [ ] 6.2 记录依赖同步检查（Dependency Sync Check）的输入、核对结论与后续动作（无漂移/已更新）。
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。
