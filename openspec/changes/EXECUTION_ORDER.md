# Active Changes Execution Order

更新时间：2026-02-09 14:50

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **2**。
- 执行模式：**串行**（先确认 `issue-334` 已 merge，再执行 `issue-336` 收口归档）。

## 执行顺序

1. `issue-334-archive-closeout-and-worktree-cleanup`（已合并，待 Rulebook 最终归档）
   - 目标：归档 `issue-326/328/330/332` 并形成收口主链路
   - 状态：PR `#335` 已 merged，遗留 `issue-334` task 归档由下游 change 处理
2. `issue-336-rulebook-archive-issue-334`（进行中）
   - 目标：归档 `issue-334` Rulebook task，补齐收口证据并完成治理闭环
   - 依赖：`issue-334` 合并结果与 active task 状态

## 依赖说明

- `issue-334-archive-closeout-and-worktree-cleanup`：
  - Dependency Sync Check 输入：
    - `openspec/changes/archive/issue-326-*`
    - `openspec/changes/archive/issue-328-*`
    - `openspec/changes/archive/issue-330-*`
    - `openspec/changes/archive/issue-332-*`
  - 核对项：
    - 归档对象完整性
    - 归档路径一致性
    - PR 可追溯性
  - 结论：`无漂移`

- `issue-336-rulebook-archive-issue-334`：
  - Dependency Sync Check 输入：
    - `openspec/changes/issue-334-archive-closeout-and-worktree-cleanup/*`
    - `rulebook/tasks/issue-334-archive-closeout-and-worktree-cleanup/*`
    - PR `#335` 合并状态
  - 核对项：
    - `issue-334` 已合并且仅剩 Rulebook task 未归档
    - 本次变更不涉及运行时代码与契约
  - 结论：`无漂移`（可进入 Red/Green 收口）

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
