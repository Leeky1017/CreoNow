# CreoNow Copilot Instructions

在这个仓库里，VS Code / GitHub Copilot Agent 不应把 GitHub 交付理解成“用户手动补最后一步”。请遵守以下规则：

- 用户的原始指令默认发给主会话 Agent；主会话 Agent 仅负责编排，不直接审计。
- 需要实现时，主会话 Agent 委派工程 Subagent 执行。
- 每一轮工程实现完成后，执行三路独立审计：与主会话同模型的独立 Subagent 做第一路全量审计，Claude Sonnet 4.6 Subagent 做第二路独立审计，强制 Copilot Rubber Duck 模式 `critique this plan` 触发 GPT-5.4 做第三路交叉审计。
- 任一审计只要报告任何问题，就继续"工程 Subagent 修复 → 三路审计复审"的循环。
- 只有三路审计都达到 zero findings，且分别给出 `FINAL-VERDICT` + `ACCEPT`，并确认 required checks 全绿、证据完整时，才可收口。
- 主会话 Agent 只有在工程 Subagent 达到“可交审条件”后，才可转给审计；未达到前不得宣称完成，不得提前收口。
- “可交审条件”至少包括：全程在 `.worktrees/issue-<N>-<slug>` 中完成实现 / 提 PR / 修 CI / 回应审计；PR 已创建或更新且正文含 `Closes #N`、`Invariant Checklist`（INV-1~INV-10 勾选项）、验证证据、回滚点、审计门禁；`scripts/agent_pr_preflight.sh` 通过；required checks 全绿；前端 PR 正文直接可见截图，并附可点击 Storybook artifact/link（适用）与视觉验收说明。
- 上述任一缺失，工程 Subagent 都必须继续工作，不得把任务转交审计 Agent。

- 先读 `AGENTS.md`、相关 `openspec/specs/<module>/spec.md`、`docs/references/audit-protocol.md`。
- 默认禁止在控制面 `main` 根目录直接实现 / 提 PR / 修 CI / 回应审计；先运行 `scripts/agent_task_begin.sh <N> <slug>` 进入 `.worktrees/issue-<N>-<slug>`（gh-only；若仅有 MCP，请改走手动脚本链路）。
- 优先复用仓库脚本，而不是即兴拼命令：
  - `scripts/agent_task_begin.sh`
  - `scripts/agent_git_hooks_install.sh`
  - `scripts/agent_worktree_setup.sh`
  - `scripts/agent_pr_preflight.sh`
  - `scripts/agent_pr_automerge_and_sync.sh`
  - `python3 scripts/agent_github_delivery.py capabilities|pr-payload|comment-payload|audit-pass`
- 发起 GitHub Issue / PR / comment 之前，先运行：
  - `python3 scripts/agent_github_delivery.py capabilities`
- 通道选择规则：
  - `selected_channel=gh`：继续使用本地 `gh` / 仓库脚本。
  - `selected_channel=mcp`：改用 GitHub MCP / API，并继续复用 `agent_github_delivery.py` 生成 payload。
  - `selected_channel=none`：明确报告 `missing_tool / missing_auth / missing_permission`，不要只说“没有 gh 上下文”。
- 默认策略：**只创建 / 更新 PR，不自动开启 auto-merge**。
  - auto-merge 默认关闭。
  - 只有在三路独立审计都已发布 zero findings 的 `FINAL-VERDICT` 且结论为 `ACCEPT` 后，才允许显式执行 `scripts/agent_pr_automerge_and_sync.sh --enable-auto-merge`。
- 不要在尚未尝试 `gh` 与 GitHub MCP 两条通道前，把 PR 创建、PR 评论、Issue 更新甩回给用户手工完成。
- PR 文案必须包含 `Closes #N`、验证证据、回滚点、审计门禁；前端 PR 还必须在正文直接嵌入截图，并附可点击 Storybook artifact/link 与视觉验收说明。
- 修改 GitHub 交付脚本或文档时，要同步维护 `AGENTS.md`、`docs/references/audit-protocol.md`、`scripts/README.md` 的一致性。

可在 VS Code Chat Diagnostics 中确认这些 instructions / prompt files / agents 是否已加载。

## Frontend Visual Quality Rules

前端任务的视觉质量规则（所有 Agent 在处理涉及前端渲染层的任务时必须遵守）。

**完整规范详见 `docs/references/frontend-visual-quality.md`**（Token 路径、组件复用、视觉验收清单等），此处仅列核心要点：

1. **实现前必须读取 Design Token 文件**（路径以 `docs/references/frontend-visual-quality.md` §二 为准）
2. **读取黄金设计源**：`figma_design/前端完整参考/` 是 CN 前端的唯一权威设计参考，前端任务开始前必须读取对应页面的 `.tsx` 源码
3. **前端策略：小修补，不大动**——现有设计中的动效、Zen Mode、布局结构、交互模式均属优秀设计，禁止推翻重建。前端任务应在现有 `figma_design/前端完整参考/` 基础上做增量修补（修 bug、接通 IPC、补充缺失状态），而非从零重写页面或组件
4. **检查视觉参考**：如果 Issue 附带了视觉参考截图或设计稿，优先参照
5. **通过 Figma MCP 读取设计上下文**：如果 Issue 附带了 Figma 文件链接，优先通过 MCP 加载设计文件，获取组件结构、样式值、布局信息（优先级高于截图和 HTML 设计稿）
6. **复用已有组件**：检查 `primitives/` 和 `composites/` 目录中的已有组件，禁止在已有 Primitive 的情况下创建新的 button/input/select
7. **新组件必须有 Storybook Story**
8. **前端 PR 的视觉验收**：Storybook 可构建 | 禁止硬编码颜色 | 交互状态有过渡动画 | PR 正文直接可见截图 | Storybook artifact/link 可点击 | 视觉验收说明明确
9. **视觉 DNA**：CreoNow 对标 Linear × Cursor × Bear 的冷灰、紧凑、克制风格。视觉决策参照 `AGENTS.md` P-V 章节。
10. **Figma Make 优先**：Agent 不应在没有设计输入（截图、Figma 设计稿、HTML 设计稿，至少有其一）的情况下做视觉决策。

## Recommended specialized entrypoints

- Use `creonow-delivery` for end-to-end Issue / PR handoff.
- Use `creonow-audit` for 1+1+1+Duck audit orchestration and enforcing three independent full audits per round.
- Use `creonow-fix-ci` when the task is to repair failing CI on an existing Issue / PR chain without breaking audit continuity.

## Audit system

审计体系采用分层自适应审计（Tiered Adaptive Audit）+ 1+1+1+Duck 三审交叉制。审计 Agent 必须：

- 审计 Agent 的职责是极严格划红线，不负责帮作者“圆过去”。
- 只有 zero findings + required checks 全绿 + 证据完整时，审计 Agent 才允许给出 `FINAL-VERDICT` + `ACCEPT`。
- 只要存在任何 finding，包括 `non-blocking` / `suggestion` / `nit` / `tiny issue`，都必须维持 `FINAL-VERDICT` = `REJECT`。
- 同一轮变更必须执行 3 路独立全量审计（与主会话同模型的独立 Subagent + Claude Sonnet 4.6 Subagent + Rubber Duck GPT-5.4），任一审计报告任何问题，都不得收口。

详见 `AGENTS.md` §九、`docs/references/audit-protocol.md`。
