# Active Changes Execution Order

更新时间：2026-02-09 04:20

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**串行**（单活跃 change）。

## 执行顺序

1. `issue-326-layer2-layer3-integration-gate`（进行中）
   - 目标：完成 Layer2 + Layer3 里程碑集成检查并输出 delta report
   - 依赖：无上游活跃 change 依赖

## 依赖说明

- 当前活跃 change（`issue-326-layer2-layer3-integration-gate`）无上游活跃依赖，Dependency Sync Check 结论为 `N/A`。
- 最近归档：
  - `memory-system-p3-isolation-degradation`
  - `knowledge-graph-p2-auto-recognition-ai-utilization`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
