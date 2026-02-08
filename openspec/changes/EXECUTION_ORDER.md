# Active Changes Execution Order

更新时间：2026-02-08 12:52

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 1。
- 执行模式：串行（single active change）。

## 执行顺序

1. `ipc-p0-envelope-ok-and-preload-security-evidence`
   - 状态：进行中（用于关闭 ISSUE-265 中 2 个 IPC 部分实现）
   - 依赖：无前置活跃 change
   - 完成标准：`32 implemented / 0 partial / 0 missing` 对应两项补齐证据落盘

## 依赖说明

- 当前仅 `ipc-p0-envelope-ok-and-preload-security-evidence` 处于活跃状态，无并行依赖冲突。
- 历史 IPC changes 已归档在 `openspec/changes/archive/`，作为本次审计基线输入。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
