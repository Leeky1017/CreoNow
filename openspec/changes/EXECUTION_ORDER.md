# Active Changes Execution Order

更新时间：2026-02-20 20:18

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**。
- 执行模式：N/A（无活跃 change）。
- 基线规则：
  - 进入 Red 前必须完成依赖同步检查（Dependency Sync Check）。
  - 若发现依赖漂移，必须先更新 proposal/spec/tasks 与本文件，再继续实现。

## 执行顺序

- N/A（无活跃 change）

## 依赖说明

- N/A（无活跃 change）

## 波次并行建议

- N/A（无活跃 change）

## 进度快照

- 本轮审计整改的 22 个 `aud-*` change 已完成文档升级并归档至 `openspec/changes/archive/`。
  - Wave0：ISSUE-589 / PR #590
  - Wave1：ISSUE-591 / PR #592
  - Wave2：ISSUE-593 / PR #594
  - Wave3：ISSUE-595 / PR #596

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
