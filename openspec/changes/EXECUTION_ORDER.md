# Active Changes Execution Order

更新时间：2026-02-14 23:31

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**（Sprint 2 Wave5 + Wave6 已完成并归档）。
- 执行模式：**无待执行 change**。
- 目标：保持控制面 `main` 与归档状态一致，等待下一批变更准入。

## 执行顺序

1. 当前无活跃 Wave。

## 依赖说明

- Wave5/Wave6 所有依赖已在交付期间完成并经主会话审计确认为 `NO_DRIFT`。
- 新增活跃 change 前，必须重新建立执行拓扑并更新本文件。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
