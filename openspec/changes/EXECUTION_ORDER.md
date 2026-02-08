# Active Changes Execution Order

更新时间：2026-02-09 03:36

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**。
- 执行模式：**无**（当前无活跃 change）。

## 执行顺序

- 当前无待执行活跃 change。

## 依赖说明

- `memory-system-p3-isolation-degradation` 已完成并归档至 `archive/memory-system-p3-isolation-degradation`。
- `knowledge-graph-p2-auto-recognition-ai-utilization` 已完成并归档至 `archive/knowledge-graph-p2-auto-recognition-ai-utilization`。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
