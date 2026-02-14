# Active Changes Execution Order

更新时间：2026-02-14 14:06

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**单线执行（无需分组）**。
- 活跃 change：`s0-kg-async-validate`。
- `s0-metadata-failfast` 已完成并归档至 `openspec/changes/archive/s0-metadata-failfast`。

## 执行顺序

1. `s0-kg-async-validate`

## 依赖说明

- `s0-kg-async-validate` 的上游 `s0-metadata-failfast` 已完成并归档；进入 Red 前仍需在其 `tasks.md`/RUN_LOG 落盘 Dependency Sync Check。
- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
