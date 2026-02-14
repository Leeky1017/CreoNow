# Active Changes Execution Order

更新时间：2026-02-14 21:29

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **9**（Sprint 2 Wave1 + Wave2 + Wave3 已完成并归档）。
- 执行模式：**跨 Wave 并行 + Wave 内按依赖约束串行**。
- 目标：在已完成 Wave1/Wave2/Wave3 基线之上，继续按依赖推进剩余 change 的 Red/Green 交付。

## 执行顺序

1. **Wave 4**

- `s2-slash-commands`
- `s2-inline-diff`
- `s2-test-timing-fix`
- `s2-story-assertions`

2. **Wave 5**

- `s2-shortcuts`
- `s2-debug-channel-gate`
- `s2-service-error-decouple`

3. **Wave 6**

- `s2-store-race-fix`
- `s2-memory-panel-error`

## 依赖说明

- `s2-slash-commands` 依赖 `s2-slash-framework`（已在 Wave3 完成交付并归档，依赖已满足）。
- `s2-shortcuts` 依赖 `s2-write-button` + `s2-bubble-ai`（均已在 Wave3 完成交付并归档，依赖已满足）。
- 债务组默认独立并行，但进入 Red 前仍必须在各自 `tasks.md` 与 RUN_LOG 落盘“依赖同步检查（Dependency Sync Check）”结论。
- 跨 Sprint 基线依赖：`s2-service-error-decouple` 依赖 `s1-ai-service-extract`。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
