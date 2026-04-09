> 本文件是 backend-design 的一部分，完整索引见 [docs/references/backend-design/README.md](README.md)

# 五、版本控制与分支写作

Git for Stories——每次 AI 写操作 = 一个版本快照，用户可以回退。分支、fork、合并为设计目标（计划实现）。

---

## 5.1 版本（Version）

- 每次 AI 写操作 = 一个 version snapshot（对应 INV-1 原稿保护）
- 用户可随时回退到任何历史版本
- 版本存储在 SQLite 的 `document_versions` 表，支持 diff 和全量快照

> **已实现位置**：线性快照存储已实现于 `apps/desktop/main/src/services/version/linearSnapshotStore.ts`（含测试 `linear-snapshot.test.ts`）。版本相关 IPC handler 见 `ipc/__tests__/version-ipc-handlers.test.ts`、`version-branch-p1-gate.test.ts`。

## 5.2 分支（Branch）

设计目标（当前分支 IPC 尚未对外暴露，`version:branch:*` handler 未注册）：

- 用户可在任意版本节点创建分支（计划实现；当前内部 `createBranch` 仅从当前 head 创建）
- 多条分支可并行存在（像 GTA5 的三个结局）
- 每条分支有自己独立的 KG（计划实现；当前 KG 表仅按 `project_id` 维度隔离，尚无 `branch_id` 关联）
- 分支可有标签（"光明结局"、"黑暗结局"、"原版"）

## 5.3 Fork（协作创作）（计划实现；当前无发布/fork/PR 协作流程）

设计目标：类似 GitHub 的开源协作模式：用户 A 发布项目 -> 用户 B fork -> 基于此写自己的故事 -> 可以提交 PR 合并回主线。

## 5.4 数据模型

> 当前运行时版本控制依赖 `document_versions` / `document_branches`。Task #87 的 TS 基线迁移（`001_initial_schema.ts`）现已同步创建这两张表；同时保留 issue 验收要求的 `versions` / `branches` 作为并行基线表。

```sql
CREATE TABLE document_branches (
  branch_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_snapshot_id TEXT NOT NULL,
  head_snapshot_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(document_id, name),
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE,
  FOREIGN KEY (base_snapshot_id) REFERENCES document_versions(version_id),
  FOREIGN KEY (head_snapshot_id) REFERENCES document_versions(version_id)
);

CREATE TABLE document_versions (
  version_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  content_json TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL DEFAULT '',
  diff_format TEXT NOT NULL DEFAULT '',
  diff_text TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  parent_snapshot_id TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

-- Task #87 parallel baseline tables (issue acceptance contract):
CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_branch_id TEXT,
  fork_version_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE versions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id),
  parent_version_id TEXT,
  content_snapshot TEXT,
  operation TEXT,
  created_at TEXT NOT NULL
);
```

优先级：基础版本控制（快照 + 回退）是 P0（INV-1 依赖），分支写作是 P2，Fork 协作是 P3+。
