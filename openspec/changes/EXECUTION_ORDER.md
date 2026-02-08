# Active Changes Execution Order

更新时间：2026-02-08 13:02

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 3，存在并行变更，需显式顺序控制。
- 执行模式：串行执行（先完成 IPC P2，再执行 AI Panel wiring，最后执行动态模型目录）。

## 执行顺序

1. `ipc-p2-acceptance-slo-and-benchmark-gates`
2. `ai-panel-model-mode-wiring`
3. `ai-model-catalog-discovery`

## 依赖说明

- `ipc-p1-ipc-testability-harness` 已完成并归档到 `openspec/changes/archive/`。
- `ipc-p2-acceptance-slo-and-benchmark-gates` 继承 `ipc-p1` 产出的测试基建作为执行前提。
- `ai-panel-model-mode-wiring` 依赖 IPC 契约 SSOT 与运行时校验链路（由已归档 `ipc-p0/p1` 变更提供）。
- `ai-model-catalog-discovery` 依赖 `ai-panel-model-mode-wiring` 完成 mode/model 透传后再扩展动态模型来源。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。

