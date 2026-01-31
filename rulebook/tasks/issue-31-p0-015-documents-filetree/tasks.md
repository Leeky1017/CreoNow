## 1. Implementation
- [ ] 1.1 补齐 `file:document:*` IPC：rename/getCurrent/setCurrent（错误码稳定）
- [ ] 1.2 DocumentService：rename/currentDocument（project 作用域，删除当前文档语义写死）
- [ ] 1.3 DB migrations：documents 字段/索引对齐 SSOT 设计（必要时新增 migration）
- [ ] 1.4 Renderer：Sidebar Files + `fileStore`（稳定 `data-testid`）

## 2. Testing
- [ ] 2.1 E2E：documents create/switch/rename/delete（含边界：空 title、超长 title、删除当前文档）
- [ ] 2.2 E2E：重启恢复 currentDocumentId，且内容互不污染（对齐 P0-005 autosave）

## 3. Documentation
- [ ] 3.1 更新 task card Completion（PR + RUN_LOG）
- [ ] 3.2 归档 rulebook task（merge 后）
