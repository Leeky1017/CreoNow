# ISSUE-266

- Issue: #266
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/266
- Branch: `task/266-db-native-binding-doctor`
- PR: https://github.com/Leeky1017/CreoNow/pull/279
- Scope: 修复 AI 面板在 DB native 绑定失配时的可诊断性与可恢复性
- Out of Scope: AI 输出自动写回编辑器正文

## Goal

- 将 DB 初始化失败细分为可判定类型并生成可执行修复建议。
- 将 DB 诊断透传到 AI 相关 IPC，并在 AI 面板显示修复指引。
- 提供统一命令入口用于 native 重建。

## Status

- CURRENT: PR 已创建并附 reviewer checklist，等待评审与 CI。

## Runs

### 2026-02-08 issue intake

- Command:
  - `gh issue view 266 --json number,title,state,url,body`
- Exit code: `0`
- Key output:
  - `title: DB_ERROR in AI panel when better-sqlite3 native binding mismatches runtime ABI`
  - `state: OPEN`

### 2026-02-08 workspace setup

- Command:
  - `git fetch origin main`
  - `git checkout main`
  - `git pull --ff-only origin main`
  - `git worktree add -b task/266-db-native-binding-doctor .worktrees/issue-266-db-native-binding-doctor origin/main`
- Exit code: `0`
- Key output:
  - `branch 'task/266-db-native-binding-doctor' set up`
  - `HEAD is now at ... origin/main`

### 2026-02-08 spec scaffolding

- Command:
  - `apply_patch`（新增 `openspec/changes/db-native-binding-doctor/**`）
  - `apply_patch`（新增 `rulebook/tasks/issue-266-db-native-binding-doctor/**`）
- Exit code: `0`
- Key output:
  - change proposal/tasks/spec delta created
  - rulebook task proposal/tasks/metadata created

### 2026-02-08 dependency bootstrap (worktree)

- Command:
  - `pnpm.cmd install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Scope: all 2 workspace projects`
  - `Lockfile is up to date`

### 2026-02-08 targeted tests

- Command:
  - `pnpm.cmd exec tsx apps/desktop/tests/unit/db-native-doctor.test.ts`
  - `pnpm.cmd exec tsx apps/desktop/tests/unit/ipc-db-not-ready-diagnostics.test.ts`
  - `pnpm.cmd exec tsx apps/desktop/renderer/src/features/ai/AiPanel.db-error.test.tsx`
- Exit code: `0`
- Key output:
  - all three targeted tests passed

### 2026-02-08 typecheck + lint

- Command:
  - `pnpm.cmd typecheck`
  - `pnpm.cmd lint`
- Exit code: `0`
- Key output:
  - typecheck passed
  - lint passed with warnings only（0 errors）

### 2026-02-08 rulebook validate blocker

- Command:
  - `rulebook task validate issue-266-db-native-binding-doctor`
- Exit code: `1`
- Key output:
  - `rulebook : The term 'rulebook' is not recognized...`
- Note:
  - local environment missing `rulebook` CLI; validation remains pending blocker until CLI is available.

### 2026-02-08 branch publish + PR

- Command:
  - `git push -u origin task/266-db-native-binding-doctor`
  - `gh pr create --repo Leeky1017/CreoNow --base main --head UntaDotMy:task/266-db-native-binding-doctor --title "Fix DB native doctor and AI DB_ERROR guidance (#266)" --body-file .pr-body-266.md`
- Exit code: `0`
- Key output:
  - branch published: `origin/task/266-db-native-binding-doctor`
  - PR created: `https://github.com/Leeky1017/CreoNow/pull/279`

### 2026-02-08 reviewer checklist comment

- Command:
  - `gh pr comment 279 --repo Leeky1017/CreoNow --body-file -`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/pull/279#issuecomment-3866549154`
