# Active Changes Execution Order

更新时间：2026-02-08 11:09

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 0。
- 执行模式：无待执行变更。

## 执行顺序

- 当前无活跃 change。

## 依赖说明

- `ipc-p1-ipc-testability-harness` 已完成并归档到 `openspec/changes/archive/`。
- `ipc-p2-acceptance-slo-and-benchmark-gates` 已完成并归档到 `openspec/changes/archive/`。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
