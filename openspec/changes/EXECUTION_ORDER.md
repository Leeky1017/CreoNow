# Active Changes Execution Order

更新时间：2026-02-14 13:02

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **2**。
- 执行模式：**串行**。
- 执行分组：
  - 串行组 B（同模块先后依赖）：`s0-metadata-failfast` → `s0-kg-async-validate`
- `s0-fake-queued-fix`、`s0-window-load-catch`、`s0-app-ready-catch`、`s0-skill-loader-error`、`s0-sandbox-enable`、`s0-context-observe` 已完成并归档至 `openspec/changes/archive/`。

## 执行顺序

1. `s0-metadata-failfast`
2. `s0-kg-async-validate`

## 依赖说明

- 唯一显式上游依赖：`s0-kg-async-validate` 依赖 `s0-metadata-failfast`，进入 Red 前必须完成并落盘 Dependency Sync Check。
- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
