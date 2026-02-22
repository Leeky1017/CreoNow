# ISSUE-608

- Issue: #608
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/608
- Branch: `task/608-cn-frontend-phase-reorg-audit-fixes`
- PR: 待回填
- Scope:
  - `openspec/_ops/task_runs/ISSUE-606.md`
  - `rulebook/tasks/issue-606-cn-frontend-phase-reorg/tasks.md`
  - `rulebook/tasks/issue-606-cn-frontend-phase-reorg/.metadata.json`
  - `openspec/changes/issue-606-phase-1-stop-bleeding/specs/workbench/spec.md`
  - `openspec/changes/issue-606-phase-1-stop-bleeding/tasks.md`
  - `openspec/changes/issue-606-phase-2-shell-decomposition/proposal.md`
  - `openspec/changes/issue-606-phase-3-quality-uplift/proposal.md`
  - `openspec/changes/issue-606-phase-3-quality-uplift/tasks.md`
  - `openspec/changes/issue-606-phase-4-polish-and-delivery/proposal.md`
  - `openspec/changes/issue-606-phase-4-polish-and-delivery/tasks.md`
  - `openspec/changes/issue-606-phase-4-polish-and-delivery/specs/project-management/spec.md`
  - `rulebook/tasks/issue-608-phase-reorg-audit-fixes/**`
  - `openspec/_ops/task_runs/ISSUE-608.md`

## Plan

- [x] 创建 OPEN Issue（#608）
- [x] 创建隔离 worktree 与 `task/608-cn-frontend-phase-reorg-audit-fixes`
- [x] 以 team 模式并行审计治理/规范/映射问题
- [x] 修复 issue-606 治理收口漂移（RUN_LOG + Rulebook 状态）
- [x] 修复 Phase 4 i18n gate 语义冲突（改为立即阻断）
- [x] 对齐 Phase 3 依赖描述与执行顺序文档
- [x] 补齐 Phase 3/4 Scenario -> 测试映射覆盖
- [x] 澄清 Phase 1 原生元素例外语义并同步映射
- [x] 补充 Phase 2/4 来源映射表增强可审计性
- [x] 运行格式与治理验证
- [ ] 提交变更并创建 PR（开启 auto-merge）
- [ ] 等待 required checks 全绿并完成 main 收口

## Runs

### 2026-02-22 Admission + Isolation

- Command:
  - `gh issue create --title "Fix issue-606 phase reorg governance/spec drift" --body-file /tmp/issue_606_audit_fix.md`
  - `git fetch origin main`
  - `git worktree add -b task/608-cn-frontend-phase-reorg-audit-fixes .worktrees/issue-608-cn-frontend-phase-reorg-audit-fixes origin/main`
- Exit code: `0`
- Key output:
  - Issue created: `https://github.com/Leeky1017/CreoNow/issues/608`
  - Branch/worktree created from latest `origin/main`

### 2026-02-22 Team-Mode Audit Dispatch

- Action:
  - 创建 team：`issue-606-audit-fix-team`
  - 并行分配治理收口、规范一致性、映射覆盖三个审计子任务
- Exit code: `0`
- Key output:
  - teammates 已收到任务并返回审计 ACK
  - 主会话按审计清单实施修复，保留单 PR 收口策略

### 2026-02-22 GitHub Reality Verification for issue-606 Closeout

- Command:
  - `gh issue view 606 --json state,url`
  - `gh pr view 607 --json state,mergedAt,url`
- Exit code: `0`
- Key output:
  - Issue `#606` state=`CLOSED`
  - PR `#607` state=`MERGED`, `mergedAt=2026-02-22T03:56:22Z`

### 2026-02-22 Validation Gates + Formatting

- Command:
  - `rulebook task validate issue-606-cn-frontend-phase-reorg`
  - `rulebook task validate issue-608-phase-reorg-audit-fixes`
  - `pnpm exec prettier --check <changed files>`
  - `pnpm install --frozen-lockfile`
  - `pnpm exec prettier --write <changed files>`
  - `pnpm exec prettier --check <changed files>`
- Exit code:
  - rulebook validate: `0`
  - prettier first check: `1`（`Command \"prettier\" not found`）
  - install: `0`
  - prettier write/check: `0`
- Key output:
  - 两个 Rulebook task 均 `valid`（warning: `No spec files found (specs/*/spec.md)`）
  - Prettier 缺失通过安装依赖修复
  - 格式化复检：`All matched files use Prettier code style!`

## Dependency Sync Check

- Inputs reviewed:
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/issue-606-phase-1-stop-bleeding/**`
  - `openspec/changes/issue-606-phase-2-shell-decomposition/**`
  - `openspec/changes/issue-606-phase-3-quality-uplift/**`
  - `openspec/changes/issue-606-phase-4-polish-and-delivery/**`
  - `/tmp/cn_notion_vault/CN前端开发/CN 前端开发/*.md`
- Result: `UPDATED`
- Notes:
  - 本任务仅修复治理与规范一致性问题，不新增运行时代码行为。

## Main Session Audit

- Audit-Owner: main-session
- Reviewed-HEAD-SHA: 待回填
- Spec-Compliance: PENDING
- Code-Quality: PENDING
- Fresh-Verification: PENDING
- Blocking-Issues: 0
- Decision: PENDING
