# Active Changes Execution Order

更新时间：2026-02-13 18:13

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **1**。
- 执行模式：**串行（单在途）**。
- 当前在途变更：`issue-513-p1p2-integration-closeout`。

## 执行顺序

1. `issue-513-p1p2-integration-closeout`

## 推荐执行序列

```text
issue-513-p1p2-integration-closeout
```

## 依赖关系总览

```text
issue-513-p1p2-integration-closeout: (no upstream active dependency)
```

## 依赖明细

- `issue-513-p1p2-integration-closeout`
  - 上游活跃依赖：无
  - Dependency Sync Check：N/A

## 依赖说明

- 当后续新增 active change 且形成依赖链时，进入 Red 前必须完成并落盘 Dependency Sync Check（数据结构、IPC 契约、错误码、阈值）。
- 若发现依赖漂移，必须先更新当前 change 文档（proposal/spec/tasks），再进入 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
