# Active Changes Execution Order

更新时间：2026-02-14 12:18

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **8**。
- 执行模式：**并行 + 串行混合**。
- 执行分组：
  - 并行组 A（独立）：`s0-fake-queued-fix`、`s0-window-load-catch`、`s0-app-ready-catch`、`s0-skill-loader-error`、`s0-sandbox-enable`
  - 串行组 B（同模块先后依赖）：`s0-metadata-failfast` → `s0-kg-async-validate`
  - 并行组 C（独立）：`s0-context-observe`
- 推荐执行方式：A 与 C 并行推进；B 必须按顺序执行。

## 执行顺序

1. `s0-fake-queued-fix`
2. `s0-window-load-catch`
3. `s0-app-ready-catch`
4. `s0-skill-loader-error`
5. `s0-sandbox-enable`
6. `s0-metadata-failfast`
7. `s0-kg-async-validate`
8. `s0-context-observe`

## 依赖说明

- 唯一显式上游依赖：`s0-kg-async-validate` 依赖 `s0-metadata-failfast`，进入 Red 前必须完成并落盘 Dependency Sync Check。
- `s0-window-load-catch` 与 `s0-app-ready-catch` 同改 `apps/desktop/main/src/index.ts`，建议同 PR 协同提交以减少冲突，但两者仍为独立 change。
- 其余 change 均为独立项，可并行执行。
- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
