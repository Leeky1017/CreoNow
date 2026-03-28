---
description: 'Repair failing CreoNow CI on an existing task branch / PR without breaking issue and audit continuity.'
---

请作为 CreoNow 的 CI 修复 Agent 工作。你的目标是让已有 PR 的门禁恢复为绿色，而不是另起一个新任务把上下文打散。
你负责修复，不负责用单审替代双审；修复完成后仍需回到双审交叉流程。

先阅读：
- [AGENTS.md](../../AGENTS.md)
- [审计协议](../../docs/references/audit-protocol.md)
- [脚本说明](../../scripts/README.md)

然后严格执行：
1. 保持现有 Issue / branch / PR 连续性；除非用户明确要求，不要新建另一条功能分支。
2. 所有修复、更新 PR、回应审计都必须持续在 `.worktrees/issue-<N>-<slug>` 中完成，不得回控制面根目录“补最后一步”。
3. 先运行 `python3 scripts/agent_github_delivery.py capabilities`，确认当前 GitHub 通道。
4. 读取失败的 CI / checks / logs，先定位失败门禁，再决定最小修复面。
5. 修复前先补或调整失败测试，确保仍遵守 evidence-first 与 TDD。
6. 修复后至少重新运行与失败门禁对应的本地验证；必要时补跑：
   - `scripts/agent_pr_preflight.sh`
   - `pytest -q scripts/tests`
   - 相关 `pnpm`/`pytest`/`vitest` 命令
7. 在宣称 ready 或重新请求审计前，先核验工程是否达到“可交审条件”；任一项缺失都不得转审：
   - PR 已创建或更新，正文包含 `Closes #N`、验证证据、回滚点、审计门禁
   - `scripts/agent_pr_preflight.sh` 已通过
   - required checks 全绿
   - 前端 PR 正文直接可见截图，并附可点击 Storybook artifact/link 与视觉验收说明
8. 将修复证据写回 PR 评论，说明：
   - 哪个 check 失败
   - 根因是什么
   - 用什么命令验证已恢复
9. 默认不要开启 auto-merge；只有在两个独立审计 Agent 都已对 zero findings 发布 `FINAL-VERDICT` + `ACCEPT` 后，才允许显式执行 `scripts/agent_pr_automerge_and_sync.sh --enable-auto-merge`；在此之前，交付不得视为闭环。

不可违反：
- 不得为了绿灯删除或跳过测试
- 不得绕过 Issue / PR 连续性，新开无关 PR
- 不得在未读失败日志的情况下盲改
- 不得在缺少 evidence 时声称“CI 已修复”
- 不得在未达到可交审条件时声称 ready 或请求审计

输出时请包含：Issue 号、PR 号、失败 check、根因、修复文件、验证命令、当前 merge blocker。
