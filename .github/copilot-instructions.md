# CreoNow Copilot Instructions

在这个仓库里，VS Code / GitHub Copilot Agent 不应把 GitHub 交付理解成“用户手动补最后一步”。请遵守以下规则：

## 1+4+1 固定编排模型配置

| 角色 | 模型 | reasoning effort | 数量 |
| --- | --- | --- | --- |
| Engineering Subagent | GPT-5.3 Codex | extra high（xhigh） | 1 |
| Audit Subagent 1 | GPT-5.4 | extra high（xhigh） | 1 |
| Audit Subagent 2 | GPT-5.3 Codex | extra high（xhigh） | 1 |
| Audit Subagent 3 | Claude Opus 4.6 | high | 1 |
| Audit Subagent 4 | Claude Sonnet 4.6 | high | 1 |
| Reviewer Subagent | Claude Opus 4.6 | high | 1 |
| Main session Agent | 与用户当前对话模型 | 不固定 | 1 |

## 主会话 Agent 角色定义（仅编排）

主会话 Agent 必须严格执行以下职责：

1. 接收用户的初始 prompt，并完整理解全部需求。
2. 将目标拆解为有顺序的子任务。
3. 按需启动工程、审计、Reviewer 子代理。
4. 监控各子代理状态，并在正确时机启动 / 停止 / 重启。
5. 向用户汇总进展。
6. 唯一目标是完整满足初始 prompt，不遗漏、不缩水。
7. 不直接写代码、不直接审计、不直接发评论；只做编排。

## 1+4+1 执行流（强制）

`用户任务` → `主会话 Agent 拆解` → `工程 Subagent（GPT-5.3 Codex xhigh）实现/测试/提 PR（含完整 INV checklist）` → `主会话并行启动 4 个审计 Subagent`：

1. GPT-5.4 xhigh 全量审计
2. GPT-5.3 Codex xhigh 全量审计
3. Claude Opus 4.6 high 全量审计
4. Claude Sonnet 4.6 high 全量审计

之后：

- 收集 4 份审计报告
- Reviewer Subagent（Claude Opus 4.6 high）发布**一条**结构化 PR 评论，在分节标题下逐条粘贴 4 份审计原文（verbatim）
- 任一 finding（含 non-blocking / suggestion / nit）→ 回工程修复
- 修复后必须重跑全部 4 审
- Reviewer 重新发布汇总
- 仅当 4 审都 zero findings 时才允许合并

## 审计规则（四审并行、全量独立）

- 四个审计 Subagent 都必须对同一变更做独立**全量审计**，禁止按维度拆分、禁止“你看安全我看性能”的分工。
- 任一 finding（包括 `non-blocking` / `suggestion` / `nit`）即 `REJECT`。
- 仅当四份审计全部 zero findings 才可进入合并。
- 每条结论必须附证据（diff 引用或命令输出）。

## Reviewer 规则

- Reviewer Subagent 仅做汇总发布，不做独立判断。
- 必须原样粘贴四份审计报告，不得删减、不得降级严重度。
- 必须发布为一条评论，而不是四条分散评论。

## Engineering 规则

- Engineering Subagent 固定使用 GPT-5.3 Codex（xhigh）。
- 编码前必须阅读 `AGENTS.md` 与 `ARCHITECTURE.md`。
- PR 正文必须包含 invariant checklist。
- 代码必须携带测试，覆盖率 `>= 80%`。

## 通用交付规则

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
  - 仅当 4 份审计报告均为 zero findings，且 Reviewer 已发布单条原样汇总评论后，才允许显式执行 `scripts/agent_pr_automerge_and_sync.sh --enable-auto-merge`。
- 不要在尚未尝试 `gh` 与 GitHub MCP 两条通道前，把 PR 创建、PR 评论、Issue 更新甩回给用户手工完成。
- PR 文案必须包含 `Closes #N`、验证证据、回滚点、审计门禁；前端 PR 还必须在正文直接嵌入截图，并附可点击 Storybook artifact/link 与视觉验收说明。
- 修改 GitHub 交付脚本或文档时，要同步维护 `AGENTS.md`、`docs/references/audit-protocol.md`、`scripts/README.md` 的一致性。

可在 VS Code Chat Diagnostics 中确认这些 instructions / prompt files / agents 是否已加载。

## Frontend Visual Quality Rules

前端任务的视觉质量规则（所有 Agent 在处理涉及前端渲染层的任务时必须遵守）。

**完整规范详见 `docs/references/frontend-visual-quality.md`**（Token 路径、组件复用、视觉验收清单等），此处仅列核心要点：

1. **实现前必须读取 Design Token 文件**（路径以 `docs/references/frontend-visual-quality.md` §二 为准）
2. **检查视觉参考**：如果 Issue 附带了视觉参考截图或设计稿，优先参照
3. **通过 Figma MCP 读取设计上下文**：如果 Issue 附带了 Figma 文件链接，优先通过 MCP 加载设计文件，获取组件结构、样式值、布局信息（优先级高于截图和 HTML 设计稿）
4. **复用已有组件**：检查 `primitives/` 和 `composites/` 目录中的已有组件，禁止在已有 Primitive 的情况下创建新的 button/input/select
5. **新组件必须有 Storybook Story**
6. **前端 PR 的视觉验收**：Storybook 可构建 | 禁止硬编码颜色 | 交互状态有过渡动画 | PR 正文直接可见截图 | Storybook artifact/link 可点击 | 视觉验收说明明确
7. **视觉 DNA**：CreoNow 对标 Linear × Cursor × Bear 的冷灰、紧凑、克制风格。视觉决策参照 `AGENTS.md` P-Visual 章节。
8. **Figma Make 优先**：Agent 不应在没有设计输入（截图、Figma 设计稿、HTML 设计稿，至少有其一）的情况下做视觉决策。

## Recommended specialized entrypoints

- Use `creonow-delivery` for end-to-end Issue / PR handoff.
- Use `creonow-audit` for 1+4+1 audit orchestration and enforcing four independent full audits per round.
- Use `creonow-fix-ci` when the task is to repair failing CI on an existing Issue / PR chain without breaking audit continuity.
- Use `creonow-reviewer` when consolidating the four audit reports into one structured PR discussion comment (issue comment). This is the only agent permitted to publish that consolidated discussion comment.

## Audit system

审计体系采用分层自适应审计（Tiered Adaptive Audit）+ 1+4+1 四审交叉制。审计 Agent 必须：

- 审计 Agent 的职责是极严格划红线，不负责帮作者“圆过去”。
- 只有 zero findings + required checks 全绿 + 证据完整时，审计 Agent 才允许给出 `FINAL-VERDICT` + `ACCEPT`。
- 只要存在任何 finding，包括 `non-blocking` / `suggestion` / `nit` / `tiny issue`，都必须维持 `FINAL-VERDICT` = `REJECT`。
- 同一轮变更必须并行执行 4 个独立全量审计，任一审计报告任何问题，都不得收口。

详见 `AGENTS.md` §九、`docs/references/audit-protocol.md`。
