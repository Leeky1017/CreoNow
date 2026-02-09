# Active Changes Execution Order

更新时间：2026-02-09 18:43

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**单变更执行**（`issue-342` 治理收口）。

## 执行顺序

1. `issue-342-governance-archive-issue-340-closeout`（进行中）
   - 目标：将已合并并已关闭的 `issue-340` 治理 change/task 从 active 面迁移到 archive
   - 依赖：`PR #341` 已合并；归档后目录状态与执行面一致性核对

## 依赖说明

- `issue-342-governance-archive-issue-340-closeout`：
  - Dependency Sync Check 输入：
    - `openspec/changes/issue-340-governance-closeout-archive-338-266/*`
    - `rulebook/tasks/issue-340-governance-closeout-archive-338-266/*`
    - `openspec/changes/EXECUTION_ORDER.md`
  - 核对项：
    - active/archive 目录状态一致
    - 仅治理文档归档，无运行时代码、IPC 契约、错误码与阈值漂移
  - 结论：`无漂移`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
