# ISSUE-31

- Issue: #31
- Branch: task/31-p0-015-documents-filetree
- PR: https://github.com/Leeky1017/CreoNow/pull/34

## Plan

- 补齐 Documents IPC + DocumentService：rename/delete/currentDocument 语义（project 作用域）
- Renderer 增加 Sidebar Files + fileStore（稳定 `data-testid`）
- 增加 Windows E2E：documents create/switch/rename/delete + 重启恢复 currentDocument

## Runs

### 2026-01-31 18:18 bootstrap

- Command: `gh issue create -t "[CN-V1] P0-015: Documents + FileTree minimal" -b "<...>"`
- Key output: `https://github.com/Leeky1017/CreoNow/issues/31`

- Command: `scripts/agent_worktree_setup.sh 31 p0-015-documents-filetree`
- Key output: `Worktree created: .worktrees/issue-31-p0-015-documents-filetree`

### 2026-01-31 18:27 deps + contract

- Command: `pnpm install`
- Key output: `Done in 1.4s`

- Command: `pnpm -s contract:generate`
- Key output: `(no output)`

### 2026-01-31 18:29 checks

- Command: `pnpm -C apps/desktop typecheck`
- Key output: `exit 0`

- Command: `pnpm -C apps/desktop lint`
- Key output: `exit 0`

- Command: `pnpm test:unit`
- Key output: `exit 0`

### 2026-01-31 18:31 pr

- Command: `git push -u origin HEAD`
- Key output: `new branch: task/31-p0-015-documents-filetree`

- Command: `gh pr create --draft --title "feat: documents rename + current doc IPC (#31)" --body "Closes #31 ..."`
- Key output: `https://github.com/Leeky1017/CreoNow/pull/34`

### 2026-01-31 17:53 filetree + e2e

- Command: `pnpm -C apps/desktop typecheck`
- Key output: `exit 0`

- Command: `pnpm -C apps/desktop lint`
- Key output: `exit 0`

- Command: `pnpm test:unit`
- Key output: `exit 0`

- Command: `pnpm -C apps/desktop test:e2e -- documents-filetree.spec.ts`
- Key output: `1 passed`

- Command: `pnpm -C apps/desktop test:e2e -- app-launch.spec.ts project-lifecycle.spec.ts editor-autosave.spec.ts`
- Key output: `3 passed`
