# CLAUDE.md

本文件是 CreoNow 的兼容治理入口，供会读取 `CLAUDE.md` 的工具链使用。
它不是第二套宪法；内容应与 `AGENTS.md`、`.github/copilot-instructions.md` 保持一致，若有差异，以那两份治理源为准。

## 治理摘要

- 主会话 Agent 只做编排，不直接写代码，也不直接输出最终审计结论。
- 工程 Subagent 只有达到“可交审条件”后才可转审；实现、提 PR、修 CI、回应审计都必须全程在 `.worktrees/issue-<N>-<slug>` 中完成。
- “可交审条件”至少包括：PR 已创建或更新，正文含 `Closes #N`、验证证据、回滚点、审计门禁；`scripts/agent_pr_preflight.sh` 已通过；required checks 全绿。
- 前端 PR 还需在正文直接可见截图，并附可点击 Storybook artifact/link 与视觉验收说明。
- 审计采用双审交叉制；只有 zero findings，且两名独立审计 Agent 分别给出 `FINAL-VERDICT` + `ACCEPT` 时，才可视为收口。
- `auto-merge 默认关闭`；只有在双审都对 zero findings 给出 `FINAL-VERDICT` + `ACCEPT` 后，才可显式开启。
- 禁止用 `Accept with risk` 或其他“带问题通过”的表述替代 `REJECT`。