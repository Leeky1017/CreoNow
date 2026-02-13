# Active Changes Execution Order

更新时间：2026-02-13 10:09

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **3**（Phase 2 Codex 上下文）。
- 执行模式：**两条并行泳道 + 依赖串行**。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 已完成归档（Phase 1）：`p1-identity-template`、`p1-assemble-prompt`、`p1-chat-skill`、`p1-aistore-messages`、`p1-multiturn-assembly`、`p1-apikey-storage`、`p1-ai-settings-ui`。
- 已完成归档（Phase 2）：`p2-kg-context-level`（C8）、`p2-entity-matcher`（C10）、`p2-fetcher-always`（C11）。

## 执行顺序

### 泳道 A — KG 扩展 + Fetchers（串行）

1. **C9** `p2-kg-aliases`（0.5d）— KG `aliases` 字段
2. **C12** `p2-fetcher-detected`（1d）— retrieved fetcher → Codex 引用检测（依赖 C10[已归档] + C11[已归档]）

### 泳道 B — Memory 注入（可与泳道 A 并行）

3. **C13** `p2-memory-injection`（1d）— settings fetcher → Memory previewInjection（依赖 P1.C2）

### 推荐执行序列

```
C9 → C12（泳道 A：依赖串行；C10/C11 已归档作为前置产物）
C13（泳道 B，可与泳道 A 并行）
```

C8/C10/C11 已归档并作为上游前置；当前泳道 A 中，C12 依赖 C10 + C11 产物。

## 依赖关系总览

```text
C8 (kg-context-level, archived) ──┬──→ C10 (entity-matcher, archived) ──┐
C9 (kg-aliases) ──────────────────┘                                     ├──→ C12 (fetcher-detected)
C8 (kg-context-level, archived) ─────────────→ C11 (fetcher-always, archived) ┘
C13 (memory-injection) — 独立泳道（依赖 P1.C2，已归档）
```

### 跨泳道依赖明细

| 下游 change               | 上游依赖（跨泳道）                   | 依赖内容                                         |
| ------------------------- | ------------------------------------ | ------------------------------------------------ |
| C12 `p2-fetcher-detected` | C10 `p2-entity-matcher`（已归档）    | `matchEntities` 函数                             |
| C12 `p2-fetcher-detected` | C11 `p2-fetcher-always`（已归档）    | `formatEntityForContext` 辅助函数                |
| C13 `p2-memory-injection` | P1.C2 `p1-assemble-prompt`（已归档） | `assembleSystemPrompt({ memoryOverlay })` 参数位 |

## 依赖说明

- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
