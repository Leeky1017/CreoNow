## 1. Implementation

- [x] 1.1 收敛并提交当前工作区全部待交付改动（含 move/delete/new）
- [x] 1.2 归档已完成 OpenSpec changes：`windows-e2e-startup-readiness`、`ai-panel-model-mode-wiring`
- [x] 1.3 恢复误归档 change：`document-management-p2-hardening-and-gates` 返回活跃目录并撤销完成标记
- [x] 1.4 同步 `openspec/changes/EXECUTION_ORDER.md` 至当前活跃状态

## 2. Testing

- [x] 2.1 执行 `rulebook task validate issue-287-deliver-pending-workspace-governance`
- [x] 2.2 执行 `scripts/agent_pr_preflight.sh` 并通过

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-287.md`（含关键命令输出）
- [ ] 3.2 完成 PR 收口并确认 required checks 全绿后合并回 `main`
