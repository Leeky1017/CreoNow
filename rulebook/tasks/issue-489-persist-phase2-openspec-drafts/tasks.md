## 1. Implementation

- [x] 1.1 创建并确认 OPEN issue `#489`
- [x] 1.2 从最新 `origin/main` 创建 `task/489-persist-phase2-openspec-drafts` worktree
- [x] 1.3 将控制面 `main` 上的未提交改动安全迁移到该 worktree
- [x] 1.4 创建 Rulebook task：`issue-489-persist-phase2-openspec-drafts`

## 2. Verification

- [x] 2.1 执行 `rulebook task validate issue-489-persist-phase2-openspec-drafts`
- [ ] 2.2 执行 `scripts/agent_pr_automerge_and_sync.sh`，等待 required checks 通过并合并
- [ ] 2.3 验证 control-plane `main` 已同步到 `origin/main`

## 3. Documentation

- [x] 3.1 编写 `openspec/_ops/task_runs/ISSUE-489.md` 初始证据
- [ ] 3.2 回填 RUN_LOG 的真实 PR URL，并追加门禁与合并证据
- [ ] 3.3 在交付完成后将当前 Rulebook task 归档到 `rulebook/tasks/archive/`
