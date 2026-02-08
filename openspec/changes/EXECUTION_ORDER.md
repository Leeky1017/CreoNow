# Active Changes Execution Order

更新时间：2026-02-08 10:43

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 1，无并行冲突。
- 执行模式：单任务推进（`ipc-p2` 独立执行）。

## 执行顺序

1. `ipc-p2-acceptance-slo-and-benchmark-gates`

## 依赖说明

- `ipc-p1-ipc-testability-harness` 已完成并归档到 `openspec/changes/archive/`。
- `ipc-p2-acceptance-slo-and-benchmark-gates` 继承 `ipc-p1` 产出的测试基建作为执行前提。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
