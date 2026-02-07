# Spec Delta: governance (ISSUE-256)

本任务不引入新治理规则，交付以下治理落盘：

- 将已完成的 Rulebook 任务 `issue-254-ipc-next-three-requirement-changes` 归档入库。
- 将 completed change 门禁提示统一明确为：当 `openspec/changes/<change>/tasks.md` 全部复选框勾选完成时，必须归档到 `openspec/changes/archive/`。

## Acceptance

- `rulebook/tasks/archive/` 中存在 `issue-254` 的归档目录。
- preflight 与 `openspec-log-guard` 的提示文案一致包含“tasks.md 全勾选”判定标准。
- 交付链路 checks 通过并合并到 `main`。
