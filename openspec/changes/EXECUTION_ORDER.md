# Active Changes Execution Order

更新时间：2026-02-13 12:22

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**。
- 执行模式：**无在途变更（待新任务入场）**。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 已完成归档（Phase 1）：`p1-identity-template`、`p1-assemble-prompt`、`p1-chat-skill`、`p1-aistore-messages`、`p1-multiturn-assembly`、`p1-apikey-storage`、`p1-ai-settings-ui`。
- 已完成归档（Phase 2）：`p2-kg-context-level`（C8）、`p2-kg-aliases`（C9）、`p2-entity-matcher`（C10）、`p2-fetcher-always`（C11）、`p2-fetcher-detected`（C12）、`p2-memory-injection`（C13）。
- 已完成归档（Fix）：`issue-499-fix-kg-aliases-ipc-contract`（F499）。

## 执行顺序

当前无 active change，暂无待执行顺序。

## 推荐执行序列

```text
N/A（等待新的 active change）
```

## 依赖关系总览

```text
N/A（当前无在途依赖）
```

## 依赖明细

当前无 active change，依赖明细为空。

## 依赖说明

- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
