# Active Changes Execution Order

更新时间：2026-02-13 01:42

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**（Phase 1 已全部归档）。
- 执行模式：**无活跃执行队列**（等待下一批 active change）。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 已完成归档（Phase 1）：`p1-identity-template`、`p1-assemble-prompt`、`p1-chat-skill`、`p1-aistore-messages`、`p1-multiturn-assembly`、`p1-apikey-storage`、`p1-ai-settings-ui`。

## 执行顺序

### 阶段 A — 当前状态

1. 当前无 active change 待执行。

## 依赖关系总览

```text
No active changes.
```

### 跨泳道依赖明细

| 下游 change              | 上游依赖（跨泳道） | 依赖内容 |
| ------------------------ | ------------------ | -------- |
| （当前无 active change） | —                  | —        |

## 依赖说明

- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
