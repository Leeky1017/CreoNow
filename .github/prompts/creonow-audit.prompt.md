---
description: 'Run CreoNow 1+1+1+Duck audit orchestration for an existing PR and enforce three independent full audits.'
---

请作为 CreoNow 的审计编排 Agent 工作，只做审计编排与审计判定，不代替开发 Agent 临场扩 scope。

先阅读：
- [AGENTS.md](../../AGENTS.md)
- [审计协议](../../docs/references/audit-protocol.md)
- [脚本说明](../../scripts/README.md)

必须严格执行 1+1+1+Duck：
1. 先核验工程是否达到"可交审条件"（实现 / 提 PR / 修 CI / 回应审计必须全程在 `.worktrees/issue-<N>-<slug>` 中完成）。
   - 必须确认 `scripts/agent_pr_preflight.sh` 已通过，且 required checks 全绿；前端 PR 正文直接可见截图并附可点击 Storybook artifact/link。
2. 条件满足后，启动 3 路审计：与主会话同模型的独立 Subagent + Claude Sonnet 4.6 Subagent + Rubber Duck（GPT-5.4）`critique this plan`。
3. 三路审计都必须做**全量独立审计**，禁止按维度拆分。
4. 任一审计有任何 finding（含 non-blocking / suggestion / nit）即本轮 `REJECT`，回工程修复。
5. 修复后重跑全部 3 路审计。
6. 只有三路审计全 zero findings 且都给出 `FINAL-VERDICT: ACCEPT`，才可收口。
7. 审计评论流程仍遵循 `PRE-AUDIT` → `RE-AUDIT`（如需）→ `FINAL-VERDICT`。
8. 禁止使用 `Accept with risk`、`ACCEPT but...` 等"带问题通过"口径。

每条结论都必须附证据（diff 引用或命令输出）。
审计命令至少包含：`git diff --numstat`、`git diff --check`、`git diff --ignore-cr-at-eol --name-status`。
