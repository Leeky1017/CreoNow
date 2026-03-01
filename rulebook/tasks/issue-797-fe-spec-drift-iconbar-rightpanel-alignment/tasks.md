更新时间：2026-03-01 10:21

## 1. Governance Alignment
- [x] 1.1 将 D1 决策落盘：`media` 保留 `[FUTURE]`，并与当前 IconBar 入口序列解耦
- [x] 1.2 将 D2 决策落盘：知识图谱语义 ID 统一为 `knowledgeGraph`
- [x] 1.3 将 D3 决策落盘：RightPanel 固定 `ai/info/quality` 三 tab
- [x] 1.4 将 guard 口径改为稳定路径校验，移除对活跃 change 路径的依赖

## 2. Evidence & Consistency
- [x] 2.1 校对 `openspec/changes/fe-spec-drift-iconbar-rightpanel-alignment/tasks.md` 与 guard 实现一致
- [x] 2.2 校对 `openspec/_ops/task_runs/ISSUE-797.md`，补齐 guard 去耦合证据描述
- [x] 2.3 将 Rulebook `proposal.md` 与 `tasks.md` 从模板占位替换为真实治理内容

## 3. Pending (Out of Scope)
- [ ] 3.1 提交/PR/auto-merge（本次按要求不提交）
- [x] 3.2 全量长测试回归证据已补齐（`pnpm -C apps/desktop test:run`：`189 files` / `1555 tests` 全通过）
- [ ] 3.3 Main Session Audit（仅提交/Apply 阶段需要，本次不执行）
