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
| `agent_pr_automerge_and_sync.sh`     | 创建 / 更新 PR；默认不开 auto-merge，四审 zero findings 全部通过、Reviewer 在 PR discussion timeline 的汇总 issue comment 匹配当前 HEAD 后才可显式开启（仅 gh 通道） | 阶段 5：提交与合并 |
| `agent_github_delivery.py`           | GitHub 能力探测、PR/评论模板、gh/MCP 通道选择                            | 阶段 5：提交与合并 |
| `review-audit.sh`                    | 分层自适应审计命令入口（Tier L/S/D），仅用于已达可交审条件的 PR          | 审计：分类后执行   |
| `daily_doc_audit.sh`                 | 每日文档健康检查：校验路径引用、INV 定义、spec 完整性                    | 手动 / 定期       |
| `agent_worktree_cleanup.sh`          | 清理 worktree                                                            | 阶段 6：收口       |

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

## 1+4+1 固定模型配置

| 角色 | 模型 | reasoning effort | 数量 |
| --- | --- | --- | --- |
| Engineering Subagent | GPT-5.3 Codex | extra high（xhigh） | 1 |
| Audit Subagent 1 | GPT-5.4 | extra high（xhigh） | 1 |
| Audit Subagent 2 | GPT-5.3 Codex | extra high（xhigh） | 1 |
| Audit Subagent 3 | Claude Opus 4.6 | high | 1 |
| Audit Subagent 4 | Claude Sonnet 4.6 | high | 1 |
| Reviewer Subagent | Claude Opus 4.6 | high | 1 |
| Main session Agent | 与用户当前对话模型 | 不固定 | 1 |

## 使用约定

- 主会话 Agent 只负责编排，不直接写代码、不直接做审计结论；实现工作交给工程 Subagent，审计工作交给 4 个独立审计 Subagent，最终评论由 Reviewer Subagent 发布。
- 工程席固定为 GPT-5.3 Codex（xhigh）；四审席固定为 GPT-5.4（xhigh）、GPT-5.3 Codex（xhigh）、Claude Opus 4.6（high）、Claude Sonnet 4.6（high）；Reviewer 席固定为 Claude Opus 4.6（high）。
- 主会话 Agent 只有在工程 Subagent 达到“可交审条件”后，才可转给审计 Subagent。
- 每一轮实现完成后，必须由 4 个独立审计 Subagent 对同一变更做全量交叉审计；任一审计报告任何问题，就必须回到工程 Subagent 修复，再次四审。
- 任一 finding（含 non-blocking / suggestion / nit）都必须维持 `REJECT`；仅当 4 个审计 Subagent 均给出 zero-findings `FINAL-VERDICT` + `ACCEPT`，且 Reviewer 已发布单条原样（verbatim）汇总评论，才可收口。
- 所有实现、提 PR、修 CI、回应审计都必须在 `.worktrees/issue-<N>-<slug>` 内完成；控制面根目录不负责“补最后一步”。
- 默认不自动开启 auto-merge；只有在四审全绿且 Reviewer 单条原样汇总评论已发布后，才可显式传入 `--enable-auto-merge`。
- `CODEX_AUDIT_TRUSTED_REVIEWERS` 可显式锁定可信 Reviewer 账号；默认不允许 PR 作者回退。仅当该变量为空且显式设置 `CODEX_AUDIT_ALLOW_PR_AUTHOR_FALLBACK=true` 时，才允许回退使用 PR 作者账号；否则门禁 fail-closed 并直接拒绝自动合并。
