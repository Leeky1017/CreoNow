# 11 - Project & Documents（project lifecycle / current project / filetree）

> 上游 Requirements：`CNWB-REQ-005`、`CNWB-REQ-006`、`CNWB-REQ-020`、`CNWB-REQ-030`  
> 目标：把 “project 与 documents 的最小闭环” 写成可实现、可验收、可 E2E 的规范，避免实现阶段在入口流/ID/落点上脑补与返工。

---

## 1. Project 模型（V1 写死）

### 1.1 `projectId` 与 rootPath

- `projectId` MUST 为稳定字符串（推荐：UUIDv4），用于关联 DB、FS 与 settings。
- `rootPath` MUST 为 Windows 可用的真实路径，且支持空格/中文路径。

### 1.2 Project Root 默认落点（V1 建议且推荐）

为避免权限/可移植问题，V1 推荐由应用托管 project root（E2E 也更稳定）：

```
<CREONOW_USER_DATA_DIR>/
  projects/
    <projectId>/
      .creonow/
      (optional) documents/  # 若未来引入文件 SSOT，可预留；V1 默认 DB 为 SSOT
```

> 注：V1 文档 SSOT 建议为 DB（见 `design/02-document-model-ssot.md`），因此 project root 的主要职责是承载 `.creonow/**` 与未来扩展。

---

## 2. Project IPC（最小集合）

### 2.1 通道（V1 MUST）

- `project:create({ name?: string })` → `{ projectId, rootPath }`
- `project:list({ includeDeleted?: boolean })` → `{ items: Array<{ projectId, name, rootPath, updatedAt }> }`
- `project:getCurrent()` → `{ projectId, rootPath } | NOT_FOUND`
- `project:setCurrent({ projectId })` → `{ projectId, rootPath } | NOT_FOUND`
- `project:delete({ projectId })` → `{ deleted: true } | NOT_FOUND`

约束：

- `project:create` MUST 确保 `.creonow/` 目录结构存在（可调用 `context:creonow:ensure`）。
- list 的排序必须确定（例如：`updatedAt desc, projectId asc`）。

### 2.2 current project 持久化（MUST）

- current project MUST 持久化（建议 settings key：`creonow.project.currentId`）。
- app 重启后必须恢复 current project；若 project 不存在则必须返回 `NOT_FOUND` 并要求用户重新选择。

---

## 3. Documents（V1 最小闭环）

### 3.1 DB SSOT 约束（与 `design/02` 对齐）

- documents 内容 SSOT = `documents.content_json`（TipTap JSON）。
- `documents.content_text/content_md` 为 derived 字段（用于 FTS/RAG/diff）。
- 文档版本历史落在 `document_versions`（actor=`user|auto|ai`）。

### 3.2 Documents IPC（V1 MUST）

为避免与 “真实文件系统文件” 混淆，V1 建议显式区分 documents：

- `file:document:create({ projectId, title?: string })` → `{ documentId }`
- `file:document:list({ projectId })` → `{ items: Array<{ documentId, title, updatedAt }> }`
- `file:document:read({ projectId, documentId })` → `{ content_json, content_text?, content_md?, content_hash, updated_at }`
- `file:document:rename({ projectId, documentId, title })` → `{ updated: true }`
- `file:document:delete({ projectId, documentId })` → `{ deleted: true }`
- `file:document:setCurrent({ projectId, documentId })` → `{ documentId } | NOT_FOUND`
- `file:document:getCurrent({ projectId })` → `{ documentId } | NOT_FOUND`

约束：

- 删除语义（V1 允许简化）必须写死：软删（tombstone）或硬删（二选一），但 list 默认不返回已删除。
- `setCurrent/getCurrent` 的作用域必须是 project（不同 project 之间不得串）。

---

## 4. FileTree UI（Sidebar Files）

对应设计稿：`12-sidebar-filetree.html`。

### 4.1 最小交互（V1 MUST）

- 列表：展示当前 project 的文档条目
- 新建：创建文档并切换为 current
- 切换：点击条目切换当前文档
- 重命名：最小可用（inline 或 dialog 均可）
- 删除：最小可用（可先无回收站，但必须可诊断）

### 4.2 稳定选择器（MUST）

- `sidebar-files`
- `file-create`
- `file-row-<documentId>`
- `file-rename-<documentId>`（若有）
- `file-delete-<documentId>`（若有）

---

## 5. Windows E2E 入口（必须可重复）

### 5.1 建议的最小 E2E 场景

- 启动 app（`CREONOW_E2E=1` + 独立 `CREONOW_USER_DATA_DIR`）
- 创建 project（UI 或 IPC）
- 创建 document → 在 filetree 可见
- 输入内容 → autosave → 重启恢复（与 `P0-005` 对齐）
- 新建第二篇 document → 切换 → 内容互不污染

### 5.2 E2E 证据点（最低标准）

- UI：断言 `sidebar-files`、`file-row-<id>` 可见
- DB：断言 `projects/documents/document_versions/settings` 表存在且有记录
- logs：至少记录 `project_created/project_set_current/document_created/document_set_current`

---

## Reference (WriteNow)

参考路径（用于提炼语义与可测模式）：

- `WriteNow/tests/e2e/app-launch.spec.ts`（稳定启动 + userDataDir 隔离的 E2E 形态）
- `WriteNow/electron/ipc/files.cjs`（文件/文档 CRUD 的错误码与边界）
- `WriteNow/src/types/ipc-generated.ts`（ipc channel 命名与请求/响应形态）
