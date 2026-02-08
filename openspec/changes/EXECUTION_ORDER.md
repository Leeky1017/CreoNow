# Active Changes Execution Order

更新时间：2026-02-08 15:41

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 1。
- 执行模式：串行（单 change 直接执行）。

## 执行顺序

1. `windows-e2e-startup-readiness`（当前进行中）

## 依赖说明

- `windows-e2e-startup-readiness` 依赖现有主 spec 能力，无前置活跃 change 依赖。
- 历史 changes 已归档在 `openspec/changes/archive/`，作为审计基线输入。

## 维护规则

- 活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
