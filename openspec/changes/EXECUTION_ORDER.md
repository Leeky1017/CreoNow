# Active Changes Execution Order

更新时间：2026-02-14 14:35

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**。
- 执行模式：**空队列（无 active change）**。
- `s0-metadata-failfast` 与 `s0-kg-async-validate` 均已归档。

## 执行顺序

1. 当前无活跃 change。

## 依赖说明

- 新增 active change 时，必须在进入 Red 前完成对应的 Dependency Sync Check 并落盘。
- 若发现 `DRIFT`，必须先更新 change 文档（`proposal.md` / `specs/*` / `tasks.md`）再推进实现。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
