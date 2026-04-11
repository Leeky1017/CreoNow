---
description: 'Create or update a CreoNow delivery PR with the 1+1+1+Duck audit-first GitHub flow.'
---

请按 CreoNow 的 1+1+1+Duck 交付链路完成任务，不要把最后一步留给用户手工补。

先阅读：
- [AGENTS.md](../../AGENTS.md)
- 任务相关模块的 `openspec/specs/<module>/spec.md`
- [审计协议](../../docs/references/audit-protocol.md)
- [脚本说明](../../scripts/README.md)

然后严格执行：
1. 运行 `python3 scripts/agent_github_delivery.py capabilities` 判定通道。
   - 创建/更新 PR 文案时使用 `python3 scripts/agent_github_delivery.py pr-payload ...`。
2. 如需创建任务工作区，优先运行 `scripts/agent_task_begin.sh <N> <slug>`；所有实现 / 提 PR / 修 CI / 回应审计都在 `.worktrees/issue-<N>-<slug>` 完成。
3. 达到“可交审条件”后再进入审计：`scripts/agent_pr_preflight.sh` 通过，required checks 全绿，前端 PR 正文含可见截图与可点击 Storybook artifact/link。
4. 审计必须是 1+1+1+Duck：与主会话同模型的 Subagent 第一路审计 + Claude Sonnet 4.6 独立审计 + Rubber Duck（GPT-5.4）`critique this plan` 交叉审计。
5. 任一审计 finding 即回工程修复并重跑三路审计。
6. 默认不启用 auto-merge；仅在三路审计全部 `FINAL-VERDICT: ACCEPT` 且 zero findings 后才可显式开启。
7. 若两条通道都不可用，明确报告 `missing_tool` / `missing_auth` / `missing_permission`。
