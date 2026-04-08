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

> 目标 schema，当前 P0 实现见 `document_versions` / `document_branches` 表（列结构有差异）。

```sql
CREATE TABLE document_branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_branch_id TEXT,
  fork_version_id TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  parent_version_id TEXT,
  content_snapshot TEXT,
  operation TEXT,            -- "ai_write" / "user_edit" / "merge"
  created_at TEXT NOT NULL,
  FOREIGN KEY (branch_id) REFERENCES document_branches(id)
);
```

优先级：基础版本控制（快照 + 回退）是 P0（INV-1 依赖），分支写作是 P2，Fork 协作是 P3+。
