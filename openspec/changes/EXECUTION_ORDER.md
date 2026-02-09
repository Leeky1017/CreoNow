# Active Changes Execution Order

更新时间：2026-02-09 12:24

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **2**。
- 执行模式：**串行**。

## 执行顺序

1. `issue-326-layer2-layer3-integration-gate`（进行中，待归档）
   - 目标：完成 Layer2 + Layer3 里程碑集成检查并输出 delta report
   - 依赖：无上游活跃 change 依赖
2. `issue-328-cross-module-contract-alignment-gate`（进行中）
   - 目标：新增 cross-module 契约自动门禁（CI + preflight）
   - 依赖：`issue-326-layer2-layer3-integration-gate`（读取其 delta 结论作为门禁基线输入）

## 依赖说明

- `issue-326-layer2-layer3-integration-gate`：无上游活跃依赖，Dependency Sync Check = `N/A`。
- `issue-328-cross-module-contract-alignment-gate`：
  - Dependency Sync Check 输入：`issue-326` 的 delta report（已实现/部分实现/未实现条目）
  - 核对项：通道命名差异、envelope 差异、错误码差异、缺失通道差异
  - 结论：`无漂移`（issue-328 采用 issue-326 已落盘差异作为初始批准漂移清单）
- 最近归档：
  - `memory-system-p3-isolation-degradation`
  - `knowledge-graph-p2-auto-recognition-ai-utilization`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
