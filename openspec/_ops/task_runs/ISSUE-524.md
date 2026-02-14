# ISSUE-524

- Issue: #524
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/524
- Branch: task/524-s0-doc-hardening
- PR: (pending)
- Scope: 对齐 Sprint0 change 文档的防再犯表达，补齐 `踩坑提醒` 与 `防治标签`
- Out of Scope: 功能代码改动、Sprint1+ 文档改造

## Plan

- [x] 创建 OPEN issue 与隔离 worktree 分支
- [x] 补丁 8 个 `s0-*/proposal.md` 的 `踩坑提醒` 与 `防治标签`
- [x] 创建并完善 Rulebook task
- [ ] 完成 preflight、PR、auto-merge、main 同步与 worktree 清理

## Runs

### 2026-02-14 12:03 准入与隔离分支创建

- Command:
  - `gh issue create --repo Leeky1017/CreoNow --title "Harden Sprint0 change docs with anti-regression tags and pitfall notes" ...`
  - `scripts/agent_worktree_setup.sh 524 s0-doc-hardening`
- Exit code: `0`
- Key output:
  - 创建 issue：`#524`
  - 创建 worktree：`.worktrees/issue-524-s0-doc-hardening`
  - 创建分支：`task/524-s0-doc-hardening`

### 2026-02-14 12:04 环境准备与 Rulebook 任务初始化

- Command:
  - `pnpm install --frozen-lockfile`
  - `rulebook task create issue-524-s0-doc-hardening`
  - `rulebook task validate issue-524-s0-doc-hardening`
- Exit code: `0`
- Key output:
  - lockfile 冻结安装完成
  - Rulebook task 创建并校验通过

### 2026-02-14 12:06 Sprint0 文档补丁实施

- Command:
  - 对 `openspec/changes/s0-*/proposal.md` 批量补丁
- Exit code: `0`
- Key output:
  - 8 个 Sprint0 proposal 均新增 `踩坑提醒` 与 `防治标签`
  - 标签集合与 `docs/plans/unified-roadmap.md` S0 对齐

### 2026-02-14 12:09 文档与治理校验

- Command:
  - `pnpm exec prettier --check openspec/changes/s0-*/proposal.md openspec/_ops/task_runs/ISSUE-524.md rulebook/tasks/issue-524-s0-doc-hardening/.metadata.json rulebook/tasks/issue-524-s0-doc-hardening/proposal.md rulebook/tasks/issue-524-s0-doc-hardening/tasks.md rulebook/tasks/issue-524-s0-doc-hardening/specs/governance/spec.md`
  - `pnpm exec prettier --write openspec/_ops/task_runs/ISSUE-524.md rulebook/tasks/issue-524-s0-doc-hardening/.metadata.json rulebook/tasks/issue-524-s0-doc-hardening/proposal.md rulebook/tasks/issue-524-s0-doc-hardening/tasks.md rulebook/tasks/issue-524-s0-doc-hardening/specs/governance/spec.md`
  - `rulebook task validate issue-524-s0-doc-hardening`
  - `awk ... openspec/changes/s0-*/proposal.md`（核对 `踩坑提醒` 与 `防治标签` 落盘）
- Exit code: `0`
- Key output:
  - 文档格式通过并统一
  - Rulebook task 校验通过
  - 8 个 Sprint0 proposal 均包含 `踩坑提醒` 与 `防治标签`
