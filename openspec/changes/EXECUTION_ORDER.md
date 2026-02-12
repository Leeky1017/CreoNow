# Active Changes Execution Order

更新时间：2026-02-12 13:12

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**。
- 执行模式：**无活跃变更（已全部归档）**。
- 最近完成归档：
  - `version-control-p4-save-contract-drift-fix`
  - `editor-p4-a11y-hardening`
  - `version-control-p4-hardening-boundary`
  - `skill-system-p4-hardening-boundary`

## 执行顺序

### 阶段 A — 等待新变更准入

1. 当前无待执行活跃 change。

## 依赖关系总览

```
当前无活跃 change，无跨泳道依赖拓扑。
```

### 跨泳道依赖明细

- 当前无跨泳道活跃依赖。

## 依赖说明

- 新增活跃 change 前，必须先完成任务准入（OPEN Issue、Rulebook task、worktree）。
- 任一新增 change 若存在上游依赖，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 当活跃 change 数量达到 2 个及以上时，需恢复多泳道顺序定义。
- 未同步本文件时，不得宣称执行顺序已确认。
