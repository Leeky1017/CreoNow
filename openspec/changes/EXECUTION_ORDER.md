# Active Changes Execution Order

更新时间：2026-02-09 14:33

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**串行**。

## 执行顺序

1. `issue-334-archive-closeout-and-worktree-cleanup`（进行中）
   - 目标：归档已合并 change/task 并完成本地 worktree 清理收口
   - 依赖：`issue-326`、`issue-328`、`issue-330`、`issue-332` 已合并产物

## 依赖说明

- `issue-334-archive-closeout-and-worktree-cleanup`：
  - Dependency Sync Check 输入：
    - `openspec/changes/archive/issue-326-*`
    - `openspec/changes/archive/issue-328-*`
    - `openspec/changes/archive/issue-330-*`
    - `openspec/changes/archive/issue-332-*`
    - `rulebook/tasks/archive/*issue-326*|*issue-328*|*issue-330*|*issue-332*`
  - 核对项：
    - 归档对象完整性
    - 归档前后路径一致性
    - RUN_LOG 与 PR 链接可追溯性
  - 结论：`无漂移`（可进入收口交付）

## 最近归档

- `issue-326-layer2-layer3-integration-gate`
- `issue-328-cross-module-contract-alignment-gate`
- `issue-330-cross-module-gate-autofix-classification`
- `issue-332-cross-module-drift-zero`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
