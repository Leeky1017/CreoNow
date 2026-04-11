# Scripts

自动化脚本，供 Agent 在交付流程中调用。交付规则见 `AGENTS.md` §四（工作流），测试规范详见 `docs/references/testing-guide.md`。

## 脚本清单

| 脚本                                 | 职责                                                                     | 调用时机           |
| ------------------------------------ | ------------------------------------------------------------------------ | ------------------ |
| `agent_controlplane_sync.sh`         | 同步控制面的 main 到最新                                                 | 阶段 3 前 + 阶段 6 |
| `agent_git_hooks_install.sh`         | 为当前 repo/worktree 安装 repo-managed git hooks                         | 阶段 3：环境隔离   |
| `agent_task_begin.sh`                | gh-only fail-closed 任务入口：capabilities + sync + worktree + hook 安装 | 阶段 3：环境隔离   |
| `agent_worktree_setup.sh`            | 创建 worktree 隔离环境                                                   | 阶段 3：环境隔离   |
| `agent_pr_preflight.sh`              | 提交前 / 请求审计前的预检查（必要不充分）                                | 阶段 5：提交前     |
| `agent_pr_automerge_and_sync.sh`     | 创建 / 更新 PR；默认不开 auto-merge，三审（1+1+1+Duck）zero findings 全部通过、Reviewer 在 PR discussion timeline 的汇总 issue comment 匹配当前 HEAD 后才可显式开启（仅 gh 通道） | 阶段 5：提交与合并 |
| `agent_github_delivery.py`           | GitHub 能力探测、PR/评论模板、gh/MCP 通道选择                            | 阶段 5：提交与合并 |
| `review-audit.sh`                    | 分层自适应审计命令入口（Tier L/S/D），仅用于已达可交审条件的 PR          | 审计：分类后执行   |
| `daily_doc_audit.sh`                 | 每日文档健康检查：校验路径引用、INV 定义、spec 完整性                    | 手动 / 定期       |
| `agent_worktree_cleanup.sh`          | 清理 worktree                                                            | 阶段 6：收口       |
| `agent_pr_preflight.py`             | PR 预检查 Python 版本（与 `.sh` 版配合）                                  | 阶段 5：提交前     |
| `wsl_storybook_url.sh`              | WSL 环境下 Storybook URL 解析                                            | 开发环境配置       |
| `capture-screenshots.mjs`           | 自动截图工具                                                             | 视觉验收           |

### TypeScript 门禁脚本清单（CI / preflight）

| 脚本 | 职责 |
| --- | --- |
| `ai-rate-limit-coverage-gate.ts` | AI 限流与覆盖率门禁 |
| `architecture-health-gate.ts` | 架构健康度门禁 |
| `bundle-size-budget.ts` | 打包体积预算门禁 |
| `contract-generate.ts` | 生成并更新跨模块契约产物 |
| `cross-module-contract-autofix.ts` | 契约门禁自动修复辅助 |
| `cross-module-contract-gate.ts` | 跨模块契约一致性门禁 |
| `ensure-desktop-native-node-abi.ts` | Electron native ABI 一致性检查 |
| `error-boundary-coverage-gate.ts` | Error Boundary 覆盖率门禁 |
| `ipc-acceptance-gate.ts` | IPC 验收门禁 |
| `ipc-handler-validation-gate.ts` | IPC handler 输入校验门禁 |
| `ipc-testability-mapping-gate.ts` | IPC 可测性映射门禁 |
| `lint-ratchet.ts` | lint ratchet（告警预算收敛） |
| `resource-size-gate.ts` | 资源尺寸/预算门禁 |
| `run-discovered-tests.ts` | 按发现清单执行测试 |
| `service-stub-detector-gate.ts` | Service stub/伪实现探测门禁 |
| `spec-test-mapping-gate.ts` | spec 与测试映射完整性门禁 |
| `storybook-chunk-budget.ts` | Storybook chunk 预算门禁 |
| `test-discovery-consistency-gate.ts` | 测试发现一致性门禁 |

## 工程 Subagent 可交审定义

工程 Subagent 的“完成”不是“代码写完”，而是已经达到可交审条件。以下条件必须全部满足，才可请求审计：

1. 全程在 `.worktrees/issue-<N>-<slug>` 中完成实现、提 PR、修 CI、回应审计。
2. PR 已创建或更新，正文包含 `Closes #N`、`Invariant Checklist`（INV-1~INV-10 勾选项）、验证证据、回滚点、审计门禁。
3. `scripts/agent_pr_preflight.sh` 通过。
4. required checks / CI / 门禁全部为绿。
5. 前端 PR 正文直接嵌入至少 1 张截图，并附可点击 Storybook artifact/link（适用）与视觉验收说明。
6. 任一条件缺失，工程阶段都不得宣称完成，也不得把任务转交审计 Agent。

## 1+1+1+Duck 审计编排模型配置

| 角色 | 说明 | 数量 |
| --- | --- | --- |
| Main session Agent | 与用户当前对话模型，**仅负责编排**，不直接审计 | 1 |
| Audit Subagent 1 | 与主会话同模型的独立 Subagent，第一路全量审计 | 1 |
| Audit Subagent 2 | Claude Sonnet 4.6，第二路独立全量审计 | 1 |
| Rubber Duck（GPT-5.4） | 每轮任务完成后，强制 `critique this plan` 交叉审计 | 1 |

## 使用约定

- 主会话 Agent **仅负责编排**，不直接审计；第一路审计由与主会话同模型的独立 Subagent 执行。
- 三路审计：与主会话同模型的 Subagent 第一路审计 + Claude Sonnet 4.6 Subagent 独立审计 + Rubber Duck（GPT-5.4）`critique this plan` 交叉审计。
- 主会话 Agent 只有在工程 Subagent 达到“可交审条件”后，才可转给审计 Subagent。
- 每一轮实现完成后，必须执行 3 路独立全量审计；任一审计报告任何问题，就必须回到工程 Subagent 修复，再次三审。
- 任一 finding（含 non-blocking / suggestion / nit）都必须维持 `REJECT`；仅当 3 路审计均给出 zero-findings `FINAL-VERDICT` + `ACCEPT` 才可收口。
- 所有实现、提 PR、修 CI、回应审计都必须在 `.worktrees/issue-<N>-<slug>` 内完成；控制面根目录不负责“补最后一步”。
- 默认不自动开启 auto-merge；只有在三路审计全绿且都给出 ACCEPT 后，才可显式传入 `--enable-auto-merge`。
- `CODEX_AUDIT_TRUSTED_REVIEWERS` 可显式锁定可信 Reviewer 账号；默认不允许 PR 作者回退。仅当该变量为空且显式设置 `CODEX_AUDIT_ALLOW_PR_AUTHOR_FALLBACK=true` 时，才允许回退使用 PR 作者账号；否则门禁 fail-closed 并直接拒绝自动合并。

## 历史/辅助脚本（未归入正式流程）

以下脚本为一次性修复或实验性质，不在正式交付流程中：

- `fix_editor.cjs` / `fix_editor.js` / `fix_editor2.cjs` / `fix_editor3.cjs` — 编辑器修复脚本（历史）
- `cc_codex_controller_prompt.md` / `cc_codex_worker.py` — Codex 集成实验

以下目录为脚本支持设施：

- `eslint-rules/` — 自定义 ESLint 规则
- `tests/` — 脚本测试
- `lint-baseline.json` — lint ratchet 基线数据
