## 1. Implementation

- [ ] 1.1 准入：确认 Issue #597 为 OPEN，创建 `task/597-aud-change-docs-archive` worktree
- [ ] 1.2 创建并维护 `openspec/_ops/task_runs/ISSUE-597.md`（在创建 PR 后回填真实 PR 链接）
- [ ] 1.3 重写全部 `openspec/changes/aud-*`（22 个）文档到 archived-change 质量：
  - `proposal.md`：明确 Why/What/Impact 与边界
  - `specs/**/spec.md`：具体 Requirement + 可测量 Scenario + Scenario ID（含错误码/阈值）
  - `tasks.md`：补齐 `Scenario -> Test` 映射表与 Evidence（Wave RUN_LOG + PR + 6.3 指针）
- [ ] 1.4 `git mv openspec/changes/aud-* openspec/changes/archive/`
- [ ] 1.5 更新 `openspec/changes/EXECUTION_ORDER.md`（active=0，日期准确）
- [ ] 1.6 运行 preflight 并修复阻塞（格式、门禁、文档校验）
- [ ] 1.7 创建 PR，开启 auto-merge，等待 required checks：`ci`、`openspec-log-guard`、`merge-serial` 全绿后合并

## 2. Testing

- [ ] 2.1 N/A（本任务不修改运行时代码）
- [ ] 2.2 运行并通过 `scripts/agent_pr_preflight.sh`
- [ ] 2.3 校验 PR required checks：`ci`、`openspec-log-guard`、`merge-serial`

## 3. Documentation

- [ ] 3.1 `rulebook task validate issue-597-aud-change-docs-archive` 通过
- [ ] 3.2 RUN_LOG 记录关键命令输入输出（preflight / PR / checks / merge / main sync）
- [ ] 3.3 PR 合并后归档 Rulebook task：`rulebook task archive issue-597-aud-change-docs-archive`
