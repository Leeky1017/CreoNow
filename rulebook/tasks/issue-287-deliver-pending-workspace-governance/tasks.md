## 1. Implementation

- [x] 1.1 收敛并提交当前工作区全部待交付改动（含 move/delete/new）
- [x] 1.2 归档已完成 OpenSpec changes：`windows-e2e-startup-readiness`、`ai-panel-model-mode-wiring`、`document-management-p2-hardening-and-gates`
- [x] 1.3 同步 `openspec/changes/EXECUTION_ORDER.md` 至归档后状态

## 2. Testing

- [x] 2.1 执行 `rulebook task validate issue-287-deliver-pending-workspace-governance`
- [x] 2.2 执行 `scripts/agent_pr_preflight.sh` 并通过

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-287.md`（含关键命令输出）
- [x] 3.2 创建 PR 并开启 auto-merge，确认 required checks 全绿后合并回 `main`
