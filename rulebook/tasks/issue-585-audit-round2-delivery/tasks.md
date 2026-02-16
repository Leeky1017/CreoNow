## 1. Implementation

- [x] 1.1 建立 `issue-585-audit-round2-delivery` Rulebook 工件并明确治理范围
- [x] 1.2 将 `docs/CN-全量代码严格审计报告-2026-02-15-第二轮.md` 纳入分支交付范围
- [x] 1.3 创建并填充 `openspec/_ops/task_runs/ISSUE-585.md`（含关键命令证据）

## 2. Verification

- [x] 2.1 `rulebook task validate issue-585-audit-round2-delivery`
- [ ] 2.2 `scripts/agent_pr_preflight.sh`

## 3. Governance

- [ ] 3.1 创建 PR（`Closes #585`）并回填 RUN_LOG 的真实 PR URL
- [ ] 3.2 开启 auto-merge 并等待 required checks（`ci`/`openspec-log-guard`/`merge-serial`）全绿
- [ ] 3.3 确认 merged 到 `main`，并完成控制面同步与 worktree 清理
