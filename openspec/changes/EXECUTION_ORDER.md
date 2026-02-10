# Active Changes Execution Order

更新时间：2026-02-10 23:23

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **8**。
- 执行模式：**三泳道并行 + 泳道内串行**。
- 变更泳道：
  - Phase 0–3 全部归档：IPC、Document Management、Project Management、Memory System、Knowledge Graph、Context Engine、AI Service、Search & Retrieval。
  - Editor：`p2 → p3 → p4`（`p0`、`p1` 已归档）
  - Skill System：`p3 → p4`（`p0`、`p1`、`p2` 已归档）
  - Version Control：`p2 → p3 → p4`（`p0`、`p1` 已归档；`p2` 有跨泳道依赖阻塞）

## 执行顺序

### 阶段 A — 起步项并行

1. `editor-p2-diff-ai-collaboration`（依赖已归档 `editor-p0` + 已归档 `editor-p1` + 已归档 AI Service Phase 3）
2. `skill-system-p3-scheduler-concurrency-timeout`（依赖已归档 `skill-system-p0` + 已归档 `skill-system-p1` + 已归档 `skill-system-p2`）
3. `version-control-p2-diff-rollback`（依赖已归档 `version-control-p0` + 已归档 `version-control-p1` + **跨泳道** `editor-p2`）

> 跨泳道阻塞：`version-control-p2` 复用 Editor 的 `DiffViewPanel` / `MultiVersionCompare`，必须等 `editor-p2` 完成后方可进入 Red。

### 阶段 B — 中段推进

4. `editor-p3-zen-mode`（依赖已归档 `editor-p0` + 已归档 `editor-p1` + `editor-p2`）
5. `skill-system-p4-hardening-boundary`（依赖已归档 `skill-system-p0` + 已归档 `skill-system-p1` + 已归档 `skill-system-p2` + `skill-system-p3`）
6. `version-control-p3-branch-merge-conflict`（依赖 `version-control-p2`）

### 阶段 C — 硬化与收口

7. `editor-p4-a11y-hardening`（依赖已归档 `editor-p0` + 已归档 `editor-p1` + `editor-p2` + `editor-p3`）
8. `version-control-p4-hardening-boundary`（依赖已归档 `version-control-p0` + 已归档 `version-control-p1` + `version-control-p2` + `version-control-p3`）

## 依赖关系总览

```
Editor 泳道:         (p0,p1 已归档) ──→ p2 ──→ p3 ──→ p4
                                        │
                                        │ \(Diff 组件)
Skill System 泳道:   (p0,p1,p2 已归档) ──→ p3 ──→ p4
Version Control 泳道:(p0,p1 已归档) ──→ p2 ──→ p3 ──→ p4
```

### 跨泳道依赖明细

| 下游 change                        | 上游依赖（跨泳道）                | 依赖内容                                 |
| ---------------------------------- | --------------------------------- | ---------------------------------------- |
| `version-control-p2-diff-rollback` | `editor-p2-diff-ai-collaboration` | DiffViewPanel / MultiVersionCompare 组件 |

## 依赖说明

- 所有存在上游依赖的 change，在进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。
- 跨泳道协同要求：
  - `version-control-p2` 进入 Red 前需同步核对 `editor-p2` 的 DiffViewPanel / MultiVersionCompare 组件 API。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
