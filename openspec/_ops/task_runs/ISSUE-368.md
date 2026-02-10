# ISSUE-368

- Issue: #368
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/368
- Branch: task/368-search-retrieval-p2-replace-versioned
- PR: (待回填)
- Scope: 完成交付 `openspec/changes/search-retrieval-p2-replace-versioned`（搜索替换预览/执行契约、全项目替换确认、替换前逐文档快照与可判定回执），并按治理流程合并回控制面 `main`
- Out of Scope: 回滚 UI 交互扩展、检索重排策略、语义检索能力新增

## Plan

- [x] 准入：创建 OPEN issue #368 + task 分支与 worktree
- [x] Rulebook task 创建并 validate
- [x] Dependency Sync Check（SR-1 / version-control / ipc）结论落盘
- [x] Red：SR3-R1-S1~S3 失败测试证据落盘
- [x] Green：`search:replace:preview/execute` 最小链路通过
- [x] Refactor：替换参数解析与回执字段统一并保持绿灯
- [ ] preflight 全绿
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 11:03 +0800 准入（Issue / Rulebook）

- Command:
  - `gh issue create --title "Search Retrieval P2: Replace Versioned" --body "..."`
  - `gh issue view 368 --json number,title,state,url,body`
  - `rulebook task create issue-368-search-retrieval-p2-replace-versioned`
  - `rulebook task validate issue-368-search-retrieval-p2-replace-versioned`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/368`
  - Issue 状态：`OPEN`
  - Rulebook task 创建成功并 validate 通过（warning: `No spec files found`）

### 2026-02-10 11:04 +0800 环境隔离（控制面同步 / worktree）

- Command:
  - `scripts/agent_worktree_setup.sh 368 search-retrieval-p2-replace-versioned`
  - `git -C .worktrees/issue-368-search-retrieval-p2-replace-versioned stash pop`
- Exit code: `0`
- Key output:
  - 控制面 `main` 已同步到 `origin/main`
  - worktree 创建成功：`.worktrees/issue-368-search-retrieval-p2-replace-versioned`
  - 分支创建成功：`task/368-search-retrieval-p2-replace-versioned`

### 2026-02-10 11:06 +0800 Dependency Sync Check（SR3）

- Input:
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/version-control/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/changes/archive/search-retrieval-p0-fts-foundation/**`
  - `openspec/changes/search-retrieval-p2-replace-versioned/specs/search-and-retrieval-delta.md`
- Checkpoints:
  - 数据结构：预览/执行回执字段可判定（文档数、匹配数、skip 原因、snapshotIds）
  - IPC 契约：新增 `search:replace:preview` / `search:replace:execute`，沿用统一 envelope
  - 错误码：预览上下文缺失使用 `VALIDATION_ERROR`；数据库失败使用 `DB_ERROR`
  - 阈值：不调整主 spec 的检索性能阈值；仅新增替换链路
- Conclusion: `NO_DRIFT`

### 2026-02-10 11:06 +0800 Red 阻塞与修复（依赖未安装）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-current-document.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-preview-confirm.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-version-snapshot.test.ts`
  - `pnpm install --frozen-lockfile`
- Exit code:
  - 前三条命令 `1`（`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "tsx" not found`）
  - 安装命令 `0`
- Key output:
  - 失败原因：worktree 初始无 `tsx` 可执行
  - 处置：按约束执行 `pnpm install --frozen-lockfile`，依赖安装完成

### 2026-02-10 11:07 +0800 Red（先写失败测试）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-current-document.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-preview-confirm.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-version-snapshot.test.ts`
- Exit code: `1`
- Key output:
  - 三个场景均失败：`AssertionError: Missing handler search:replace:preview`
  - 失败原因符合预期（`search:replace:*` 尚未注册），可进入 Green

### 2026-02-10 11:12 +0800 Green（最小实现）

- Command:
  - `apply_patch`（新增 `apps/desktop/main/src/services/search/searchReplaceService.ts`）
  - `apply_patch`（更新 `apps/desktop/main/src/ipc/search.ts` 注册 preview/execute）
  - `apply_patch`（更新 `apps/desktop/main/src/ipc/contract/ipc-contract.ts`）
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 新增 `search:replace:preview`：返回 `affectedDocuments/totalMatches/items/warnings/previewId`
  - 新增 `search:replace:execute`：返回 `replacedCount/affectedDocumentCount/snapshotIds/skipped`
  - whole-project 执行强制 `confirmed + previewId`，缺失返回 `VALIDATION_ERROR`
  - 全项目替换前先写 `pre-search-replace` 快照，失败文档写入 `skipped`

### 2026-02-10 11:14 +0800 Green 验证（SR3-R1-S1~S3）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-current-document.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-preview-confirm.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/replace-version-snapshot.test.ts`
- Exit code:
  - 首轮：`S1/S2=0`，`S3=1`（断言过严，返回多了 `message` 字段）
  - 修正后重跑 `S3=0`
- Key output:
  - S1：当前文档替换成功，`replacedCount=2`
  - S2：全项目执行未预览被阻断；预览后执行成功
  - S3：快照失败文档被跳过，`reason=SNAPSHOT_FAILED`

### 2026-02-10 11:20 +0800 回归验证链

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code:
  - `typecheck` => `0`
  - `lint` => `0`（仅历史 warning，无 error）
  - `cross-module:check` => `0`
  - `test:unit` => `0`
  - `test:integration` => `0`
- Key output:
  - 类型检查全绿
  - cross-module gate: `PASS`
  - 全量 unit / integration 均通过

### 2026-02-10 11:21 +0800 contract:check 状态

- Command:
  - `pnpm contract:check`
- Exit code: `1`
- Key output:
  - 失败原因为 `packages/shared/types/ipc-generated.ts` 相对 `HEAD` 存在本次新增通道差异（预期）
  - 后续在提交包含生成物后，于 preflight 复核该项

### 2026-02-10 11:23 +0800 Change 收口（任务勾选 + 归档 + 顺序文档同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/search-retrieval-p2-replace-versioned/tasks.md`
  - `git mv openspec/changes/search-retrieval-p2-replace-versioned openspec/changes/archive/search-retrieval-p2-replace-versioned`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/search-retrieval-p2-replace-versioned`
  - `EXECUTION_ORDER.md` 已同步为 10 个活跃 change，更新时间 `2026-02-10 11:23`
  - Search & Retrieval 泳道更新为 `p3 → p4`

### 2026-02-10 11:24 +0800 Rulebook 归档

- Command:
  - `rulebook task validate issue-368-search-retrieval-p2-replace-versioned`
  - `rulebook task archive issue-368-search-retrieval-p2-replace-versioned`
- Exit code: `0`
- Key output:
  - validate 通过（warning: `No spec files found`）
  - task 已归档至：`rulebook/tasks/archive/2026-02-10-issue-368-search-retrieval-p2-replace-versioned`
