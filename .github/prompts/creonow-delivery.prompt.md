---
description: 'Create or update a CreoNow delivery PR with the repo audit-first GitHub flow.'
---

请按 CreoNow 的交付链路完成任务，重点解决 GitHub Issue / PR / comment / merge 相关动作，不要把最后一步留给用户手工补。

你负责的是编排与交付收口，不是替主会话直接跳过工程/审计分工。

先阅读：
- [AGENTS.md](../../AGENTS.md)
- 任务相关模块的 `openspec/specs/<module>/spec.md`
- [审计协议](../../docs/references/audit-protocol.md)
- [脚本说明](../../scripts/README.md)

然后严格执行：
0. 禁止在控制面 `main` 根目录直接开发；若当前目录仍是控制面根目录，先转入 `.worktrees/issue-<N>-<slug>`。
1. 运行 `python3 scripts/agent_github_delivery.py capabilities` 判定当前使用 `gh`、GitHub MCP，还是应当阻断。
2. 如需新任务，确认 / 创建 Issue，并优先使用 `scripts/agent_task_begin.sh <N> <slug>` 建立隔离 worktree（gh-only 入口；若仅有 MCP，请按 repo docs 手动执行 controlplane sync + worktree setup）。
3. 所有实现 / 提 PR / 修 CI / 回应审计都必须持续在 `.worktrees/issue-<N>-<slug>` 中完成，不得回控制面根目录“补最后一步”。
4. 在请求审计或宣称 ready 前，先核验工程是否达到“可交审条件”；任一项缺失都不得转审，也不得视为 ready：
	- PR 已创建或更新，正文包含 `Closes #N`、验证证据、回滚点、审计门禁
	- `scripts/agent_pr_preflight.sh` 已通过
	- required checks 全绿
	- 前端 PR 正文直接可见截图，并附可点击 Storybook artifact/link 与视觉验收说明
5. 创建或更新 PR 时，使用 `python3 scripts/agent_github_delivery.py pr-payload ...` 生成 title/body，保持与仓库模板一致。
6. 若需发布 blocker 评论，使用 `python3 scripts/agent_github_delivery.py comment-payload ...` 生成文案。
7. 默认只创建 / 更新 PR，不自动开启 auto-merge；auto-merge 默认关闭。
8. 只有在两个独立审计 Agent 都已对 zero findings 发布 `FINAL-VERDICT` + `ACCEPT` 后，才允许显式执行 `scripts/agent_pr_automerge_and_sync.sh --enable-auto-merge`；在此之前，交付不得视为闭环。
9. 若两条通道都不可用，必须清楚说明阻断原因是 `missing_tool`、`missing_auth` 还是 `missing_permission`。

输出时请包含：Issue 号、分支名、验证命令、PR 链接、当前 merge blocker。
