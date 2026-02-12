# Active Changes Execution Order

更新时间：2026-02-12 10:47

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **4**。
- 执行模式：**三泳道并行 + 泳道内串行**。
- 变更泳道：
  - Phase 0–3 全部归档：IPC、Document Management、Project Management、Memory System、Knowledge Graph、Context Engine、AI Service、Search & Retrieval。
  - Editor：`p4`（`p0`、`p1`、`p2`、`p3` 已归档）
  - Skill System：`p3 → p4`（`p0`、`p1`、`p2` 已归档）
  - Version Control：`p4`（`p0`、`p1`、`p2`、`p3` 已归档）

## 执行顺序

### 阶段 A — 起步项并行

1. `editor-p4-a11y-hardening`（依赖已归档 `editor-p0` + 已归档 `editor-p1` + 已归档 `editor-p2` + 已归档 `editor-p3`）
2. `skill-system-p3-scheduler-concurrency-timeout`（依赖已归档 `skill-system-p0` + 已归档 `skill-system-p1` + 已归档 `skill-system-p2`）

### 阶段 B — 中段推进

3. `skill-system-p4-hardening-boundary`（依赖已归档 `skill-system-p0` + 已归档 `skill-system-p1` + 已归档 `skill-system-p2` + `skill-system-p3`）
4. `version-control-p4-hardening-boundary`（依赖已归档 `version-control-p0` + 已归档 `version-control-p1` + 已归档 `version-control-p2` + 已归档 `version-control-p3`）

## 依赖关系总览

```
Editor 泳道:         (p0,p1,p2,p3 已归档) ──→ p4
Skill System 泳道:   (p0,p1,p2 已归档) ──→ p3 ──→ p4
Version Control 泳道:(p0,p1,p2,p3 已归档) ──→ p4
```

### 跨泳道依赖明细

- 当前活跃 change 无新增跨泳道阻断依赖。

## 依赖说明

- 所有存在上游依赖的 change，在进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。
- 跨泳道协同要求：
  - `version-control-p4` 推进时，沿用并核对归档 `editor-p2` 与归档 `version-control-p3` 的 Diff/冲突流程接口假设。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
