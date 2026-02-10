# Active Changes Execution Order

更新时间：2026-02-10 17:46

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **14**。
- 执行模式：**三泳道并行 + 泳道内串行**。
- 变更泳道：
  - Phase 0–3 全部归档：IPC、Document Management、Project Management、Memory System、Knowledge Graph、Context Engine、AI Service、Search & Retrieval。
  - Editor：`p0 → p1 → p2 → p3 → p4`（Phase 4，5 个活跃 change）
  - Skill System：`p0 → p1 → p2 → p3 → p4`（Phase 4，5 个活跃 change）
  - Version Control：`p1 → p2 → p3 → p4`（Phase 4，4 个活跃 change；`p0` 已归档）

## 执行顺序

### 阶段 A — 双泳道 p0 并行 + Version Control 准入

可并行执行，无跨泳道依赖：

1. `editor-p0-tiptap-foundation-toolbar`（依赖已归档 IPC Phase 0 + Document Management Phase 1）
2. `skill-system-p0-builtin-skills-executor`（依赖已归档 AI Service Phase 3 + Context Engine Phase 3 + IPC Phase 0）

> `version-control-p0-snapshot-history` 已完成并归档至 `openspec/changes/archive/`，Version Control 泳道从 `p1` 继续推进。

### 阶段 B — 各泳道 p1 并行

阶段 A 对应泳道的 p0 完成后方可进入：

3. `editor-p1-bubble-menu-outline`（依赖 `editor-p0`）
4. `skill-system-p1-trigger-scope-management`（依赖 `skill-system-p0`）
5. `version-control-p1-ai-mark-preview`（依赖已归档 `version-control-p0` + `editor-p0`）

### 阶段 C — 各泳道 p2 并行（含跨泳道依赖）

6. `editor-p2-diff-ai-collaboration`（依赖 `editor-p0` + 已归档 AI Service Phase 3）
7. `skill-system-p2-custom-skill-crud`（依赖 `skill-system-p1` + 已归档 AI Service Phase 3）
8. `version-control-p2-diff-rollback`（依赖已归档 `version-control-p0` + `version-control-p1` + **跨泳道** `editor-p2`）

> 跨泳道阻塞：`version-control-p2` 复用 Editor 的 `DiffViewPanel` / `MultiVersionCompare` 组件，必须等 `editor-p2` 完成后方可进入 Red。

### 阶段 D — 各泳道 p3 并行

9. `editor-p3-zen-mode`（依赖 `editor-p0`，可与阶段 B/C 并行）
10. `skill-system-p3-scheduler-concurrency-timeout`（依赖 `skill-system-p0`，可与阶段 B/C 并行）
11. `version-control-p3-branch-merge-conflict`（依赖 `version-control-p2`）

> 注意：`editor-p3` 和 `skill-system-p3` 仅依赖各自 p0，理论上可提前到阶段 B 并行执行。但为控制活跃 change 数量和审阅负荷，建议按阶段 D 排列。

### 阶段 E — 各泳道 p4 硬化（收口）

12. `editor-p4-a11y-hardening`（依赖 `editor-p0` ~ `editor-p3`）
13. `skill-system-p4-hardening-boundary`（依赖 `skill-system-p0` ~ `skill-system-p3`）
14. `version-control-p4-hardening-boundary`（依赖已归档 `version-control-p0` + `version-control-p1` ~ `version-control-p3`）

## 依赖关系总览

```
Editor 泳道:          p0 ──→ p1 ──→ p2 ──→ p3 ──→ p4
                       │\            │
                       │ \(只读)     │ (Diff 组件)
Skill System 泳道:    p0 ──→ p1 ──→ p2 ──→ p3 ──→ p4
                       │  \          │
                       │(保存) \     │
                       ↓      ↓     ↓
Version Control 泳道: [p0 已归档] ──→ p1 ──→ p2 ──→ p3 ──→ p4
```

### 跨泳道依赖明细

| 下游 change                          | 上游依赖（跨泳道）                    | 依赖内容                                 |
| ------------------------------------ | ------------------------------------- | ---------------------------------------- |
| `version-control-p1-ai-mark-preview` | `editor-p0-tiptap-foundation-toolbar` | 编辑器只读模式/工具栏禁用                |
| `version-control-p2-diff-rollback`   | `editor-p2-diff-ai-collaboration`     | DiffViewPanel / MultiVersionCompare 组件 |

## 依赖说明

- 所有存在上游依赖的 change，在进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。
- 跨泳道协同要求：
  - `version-control-p1` 进入 Red 前需同步核对 `editor-p0` 的只读模式/工具栏禁用接口。
  - `version-control-p2` 进入 Red 前需同步核对 `editor-p2` 的 DiffViewPanel / MultiVersionCompare 组件 API。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
