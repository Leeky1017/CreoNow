# Active Changes Execution Order

更新时间：2026-02-08 00:57

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 3，采用**串行**执行。
- 执行模式：串行（先稳定命名约束，再固化测试基建，最后建立验收门禁）。

## 执行顺序

1. `ipc-p1-channel-naming-governance`
2. `ipc-p1-ipc-testability-harness`
3. `ipc-p2-acceptance-slo-and-benchmark-gates`

## 依赖说明

- `ipc-p1-ipc-testability-harness` 依赖 `ipc-p1-channel-naming-governance`：命名治理稳定后，测试基建中的通道断言与映射才能固定。
- `ipc-p2-acceptance-slo-and-benchmark-gates` 依赖前两项：需要在命名契约稳定且测试基建落地后，才能可靠执行性能与验收门禁。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
