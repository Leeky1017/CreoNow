## 1. Implementation

- [x] 1.1 扩展 IPC contract + codegen（`file:*` + `version:*` 最小集）
- [x] 1.2 SQLite schema/migrations：补齐 documents + document_versions 字段与索引
- [x] 1.3 derive：`content_json -> content_text/content_md`（deterministic）+ unit tests
- [x] 1.4 DocumentService：SSOT 写入 + derived 生成 + version 落盘（事务）
- [x] 1.5 main IPC：document CRUD（create/read/write/list/delete）+ currentDocument（最小）+ version list/restore
- [x] 1.6 renderer：EditorPane（TipTap）+ editorStore + autosave hook + StatusBar 状态
- [x] 1.7 E2E：`editor-autosave.spec.ts`（输入→saved→重启恢复→version evidence）

## 2. Testing

- [x] 2.1 本地：`pnpm test:unit`（含 `derive.test.ts`）
- [x] 2.2 本地：`pnpm -C apps/desktop test:e2e -- editor-autosave.spec.ts`
- [x] 2.3 本地：`scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-27.md` 并持续追加 Runs（只追加不回写）
- [x] 3.2 补齐 spec delta 并保持 `rulebook task validate` 通过
