# Active Changes Execution Order

更新时间：2026-02-09 16:27

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**单变更执行**（`issue-340` 治理收口）。

## 执行顺序

1. `issue-340-governance-closeout-archive-338-266`（进行中）
   - 目标：归档已合并 active changes（issue-338 / issue-266）与对应 Rulebook active tasks
   - 依赖：`PR #339` 与 `PR #279` 合并事实；目录状态与执行面一致性核对

## 依赖说明

- `issue-340-governance-closeout-archive-338-266`：
  - Dependency Sync Check 输入：
    - `openspec/changes/archive/issue-338-governance-closeout-active-legacy/*`
    - `openspec/changes/archive/db-native-binding-doctor/*`
    - `rulebook/tasks/archive/issue-338-governance-closeout-active-legacy/*`
    - `rulebook/tasks/archive/issue-266-db-native-binding-doctor/*`
  - 核对项：
    - active 目录与 archive 目录状态一致
    - 仅治理文档归档，无运行时代码、IPC 契约与错误码漂移
  - 结论：`无漂移`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
