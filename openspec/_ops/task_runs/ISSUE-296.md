# ISSUE-296

- Issue: #296
- Branch: task/296-change-dependency-sync-governance
- PR: https://github.com/Leeky1017/CreoNow/pull/298

## Plan

- 将“串行依赖”从仅顺序约束升级为“顺序 + 一致性核对”约束。
- 在 AGENTS / delivery-skill / template / preflight 中增加 Dependency Sync Check 强制规则。
- 回写当前串行链（Memory、Project Management）change 任务卡。

## Runs

### 2026-02-08 20:20 任务准入

- Command: `gh issue create --title "Governance: add dependency sync check for serial OpenSpec changes" ...`
- Key output: 创建 OPEN Issue `#296`。
- Command: `git worktree add .worktrees/issue-296-change-dependency-sync-governance -b task/296-change-dependency-sync-governance origin/main`
- Key output: 创建并切入隔离 worktree。

### 2026-02-08 20:25 规则与模板更新

- 更新 `AGENTS.md`：新增 Dependency Sync Check 强制规则、禁止项、异常处理条目。
- 更新 `docs/delivery-skill.md`：新增依赖同步检查门禁与漂移处理。
- 更新 `openspec/changes/_template/{README.md,tasks.md,EXECUTION_ORDER.example.md}`。
- 更新 `scripts/agent_pr_preflight.py`：新增 dependency-sync 文案校验。
- 更新串行链任务卡：Memory P1/P2/P3、Project Management P0/P1。

### 2026-02-08 20:26 EXECUTION_ORDER 同步

- Command: `date '+%Y-%m-%d %H:%M'`
- Key output: `2026-02-08 20:25`
- 更新 `openspec/changes/EXECUTION_ORDER.md` 更新时间和维护规则。

### 2026-02-08 20:30 PR 创建与回填

- Command: `gh pr create --base main --head task/296-change-dependency-sync-governance ...`
- Key output: 创建 PR `https://github.com/Leeky1017/CreoNow/pull/298`。
- Command: 更新 RUN_LOG 的 `PR` 字段为真实链接
- Key output: 满足 openspec-log-guard 与 preflight 的 PR 字段约束。
