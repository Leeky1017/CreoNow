---
description: 'Repair failing CreoNow CI on an existing task branch / PR without breaking 1+1+1+Duck continuity.'
---

请作为 CreoNow 的 CI 修复 Agent 工作。目标是恢复已有 PR 门禁为绿，不打散 Issue / branch / PR 连续性。

先阅读：
- [AGENTS.md](../../AGENTS.md)
- [审计协议](../../docs/references/audit-protocol.md)
- [脚本说明](../../scripts/README.md)

然后严格执行：
1. 保持现有 Issue / branch / PR 连续性。
2. 所有修复、更新 PR、回应审计均在 `.worktrees/issue-<N>-<slug>` 内完成。
3. 先跑 `python3 scripts/agent_github_delivery.py capabilities`。
4. 先读失败 checks/logs，再做最小修复。
5. 修复后重跑相关验证并贴证据（evidence，至少包含 `scripts/agent_pr_preflight.sh` 与失败门禁对应测试命令）。
6. 宣称 ready 前必须重新满足“可交审条件”，尤其是 required checks 全绿；前端 PR 需保留可见截图与可点击 Storybook artifact/link。
7. 修复完成后回到 1+1+1+Duck 审计循环：三路审计、任一 finding 回修、三路全 `FINAL-VERDICT: ACCEPT` 且 zero findings 才可收口。
8. 默认不启用 auto-merge。
