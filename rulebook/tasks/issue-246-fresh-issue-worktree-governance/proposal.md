# Proposal: issue-246-fresh-issue-worktree-governance

## Why

近期出现两类重复返工：一是误用历史/已关闭 Issue 执行新任务，二是 RUN_LOG 的 PR 字段以占位符进入交付。需要把这两类问题升级为“文档规则 + preflight 门禁 + 交付脚本自动修正”的组合防线。

## What Changes

- 在 `AGENTS.md` 与 `docs/delivery-skill.md` 增加强制规则：新任务必须使用当前 OPEN Issue，并从最新 `origin/main` 创建 worktree。
- 在 `scripts/agent_pr_preflight.py` 增加门禁：校验 Issue 必须 OPEN；校验 RUN_LOG 的 PR 字段必须是非占位符 PR URL。
- 在 `scripts/agent_pr_automerge_and_sync.sh` 增加自动回填：PR 创建后自动写回 RUN_LOG 的真实 PR 链接并重新 preflight。
- 回填 `openspec/_ops/task_runs/ISSUE-244.md` 的真实 PR 链接。

## Impact

- Affected specs:
  - `AGENTS.md`
  - `docs/delivery-skill.md`
- Affected code:
  - `scripts/agent_pr_preflight.py`
  - `scripts/agent_pr_automerge_and_sync.sh`
  - `scripts/README.md`
  - `openspec/_ops/task_runs/ISSUE-244.md`
- Breaking change: NO
- User benefit: 避免“复用旧 Issue”与“PR 占位符漏回填”导致的重复返工。
