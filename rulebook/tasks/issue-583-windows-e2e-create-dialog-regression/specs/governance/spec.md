# Governance Task Spec — issue-583-windows-e2e-create-dialog-regression

## Scope

为 issue #583 建立完整治理交付轨迹：补齐 Rulebook 任务文件与 RUN_LOG，
记录 windows-e2e 根因、修复迭代、聚焦验证，并保持 PR 前状态一致性。

## Acceptance

- Rulebook 目录存在且完整：
  - `.metadata.json`
  - `proposal.md`
  - `specs/governance/spec.md`
  - `tasks.md`
- RUN_LOG `openspec/_ops/task_runs/ISSUE-583.md` 必须包含：
  - issue/pr 占位符（PR 尚未创建）
  - 根因捕获记录（bundled 路径与产物缺失）
  - 补丁迭代记录（至少一轮失败与后续修正）
  - 验证命令与结果（聚焦测试 + build 产物确认）
- Plan 与 Delivery checklist 必须反映当前真实状态：
  - 修复与本地验证已完成
  - PR / auto-merge / required checks / main 同步尚未完成
- RUN_LOG 当前阶段不得出现 `Main Session Audit` 区块。
