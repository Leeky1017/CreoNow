# Tasks: issue-600-doc-reality-alignment

更新时间：2026-02-21 11:57

## 1. Implementation

- [x] 1.1 建立治理基线：OPEN Issue + worktree + Rulebook validate + RUN_LOG
- [x] 1.2 产出 Swarm 任务图与分工清单，并完成 Owner 确认
- [x] 1.3 Repo truth baseline：门禁、脚本、CI、文档事实来源的代码证据（`path:line`）
- [x] 1.4 全量文档盘点与失真分级（P0/P1/P2）+《文档-代码对齐矩阵》
- [x] 1.5 文档修复（根文档/`docs/**`/`README*`）按模块分批落地
- [ ] 1.6 文档修复（`openspec/**`/`rulebook/**`）按模块分批落地（archives 保持不可篡改）
- [x] 1.7 时间戳治理规范文档落地（范围/例外/校验方式）
- [x] 1.8 时间戳自动校验脚本 + CI 接入（接入 required check `ci`）

## 2. Testing

- [x] 2.1 Red：timestamp 校验对缺少时间戳/格式不符的受管文档变更失败（预期）
- [x] 2.2 Green：补齐后校验通过（预期）
- [ ] 2.3 本地 preflight：`./scripts/agent_pr_preflight.sh` 通过（记录失败与修复证据）
- [ ] 2.4 PR required checks 全绿：`ci` / `openspec-log-guard` / `merge-serial`

## 3. Governance

- [ ] 3.1 RUN_LOG 证据链完善（命令、输出、失败修复、PR/merge 真实链接）
- [ ] 3.2 PR 开启 auto-merge，等待 required checks 全绿后自动合并
- [ ] 3.3 合并后收口：控制面 `main` 同步（`HEAD == origin/main`）+ worktree cleanup
- [ ] 3.4 Rulebook task 归档（允许同 PR 自归档，禁止递归 closeout issue）

## 4. Review

- [ ] 4.1 交叉复核：Fixer-1/Fixer-2 相互抽检，Independent Reviewer 二次抽检
- [ ] 4.2 Lead 终审签字：RUN_LOG `## Main Session Audit` 全部 PASS，且签字提交仅允许变更 RUN_LOG
