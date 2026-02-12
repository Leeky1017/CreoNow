# Spec Delta: workbench (ISSUE-435)

本任务交付 `openspec/changes/workbench-p5-00-contract-sync` 的规范收口，不新增功能代码，仅完成以下基线对齐与证据闭环：

- IPC 通道命名对齐：
  - `project:switch` -> `project:project:switch`
  - `project:list:recent` -> `project:project:list`
- IconBar 列表对齐：
  - 新增 `search`、`versionHistory`、`memory`
  - `graph` 统一为 `knowledgeGraph`
  - `media` 标记为 V1 deferred
- RightPanel tab 类型对齐：
  - `RightPanelType = "ai" | "info" | "quality"`

## Acceptance

- `openspec/changes/archive/workbench-p5-00-contract-sync/tasks.md` 全部勾选完成并落盘证据。
- `openspec/_ops/task_runs/ISSUE-435.md` 记录关键命令输入/输出与结论。
- `workbench-p5-00-contract-sync` 从 active 归档到 `openspec/changes/archive/`。
- `openspec/changes/EXECUTION_ORDER.md` 同步反映归档后的活跃 change 顺序与依赖。
