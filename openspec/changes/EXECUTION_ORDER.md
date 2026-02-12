# Active Changes Execution Order

更新时间：2026-02-13 01:06

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**（Phase 1 收敛阶段）。
- 执行模式：**单泳道串行**。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 变更泳道（Phase 1）：
  - AI Service 泳道：`p1-multiturn-assembly`（上游 `p1-assemble-prompt`、`p1-aistore-messages` 已归档）
- 已完成归档：`p1-identity-template`、`p1-assemble-prompt`、`p1-chat-skill`、`p1-aistore-messages`、`p1-apikey-storage`、`p1-ai-settings-ui`

## 执行顺序

### 阶段 A — 多轮对话收口

1. `p1-multiturn-assembly`（ai-service，依赖已满足：`p1-assemble-prompt`、`p1-aistore-messages` 已归档）

## 依赖关系总览

```
AI Service 泳道:    p1-multiturn-assembly（remaining active）
```

### 跨泳道依赖明细

| 下游 change              | 上游依赖（跨泳道） | 依赖内容 |
| ------------------------ | ------------------ | -------- |
| （Phase 1 无跨泳道依赖） | —                  | —        |

## 依赖说明

- 所有存在上游依赖的 change，在进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
