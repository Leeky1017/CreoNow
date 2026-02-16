## 1. Implementation

- [x] 1.1 建立 issue-587 工作分支并初始化 Rulebook 工件
- [x] 1.2 将审计问题拆解为 22 个细粒度 active changes（每项含 proposal/spec/tasks）
- [x] 1.3 维护 `openspec/changes/EXECUTION_ORDER.md` 并写明依赖拓扑
- [x] 1.4 完成 Owner 代审并落盘审批记录
- [x] 1.5 产出实施波次编排与双层审计流程文档

## 2. Verification

- [x] 2.1 变更结构检查（proposal/spec/tasks 完整性）
- [x] 2.2 TDD 章节顺序与 Dependency Sync Check 关键字检查
- [x] 2.3 `rulebook task validate issue-587-audit-change-decomposition`
- [ ] 2.4 `scripts/agent_pr_preflight.sh`

## 3. Governance

- [ ] 3.1 创建 PR（`Closes #587`）并回填 RUN_LOG 真实 PR URL
- [ ] 3.2 开启 auto-merge，等待 required checks（`ci`/`openspec-log-guard`/`merge-serial`）全绿
- [ ] 3.3 确认 merged 到 `main`，并完成控制面同步与 worktree 清理
