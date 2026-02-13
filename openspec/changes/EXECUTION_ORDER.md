# Active Changes Execution Order

更新时间：2026-02-13 11:05

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **3**。
- 执行模式：**两条并行泳道 + 一条故障修复优先泳道**。
- 路线图主线：Phase-2 C12/C13 持续推进；Issue-499 为已归档 C9 产物的契约修复插队项。
- 已完成归档（Phase 1）：`p1-identity-template`、`p1-assemble-prompt`、`p1-chat-skill`、`p1-aistore-messages`、`p1-multiturn-assembly`、`p1-apikey-storage`、`p1-ai-settings-ui`。
- 已完成归档（Phase 2）：`p2-kg-context-level`（C8）、`p2-kg-aliases`（C9）、`p2-entity-matcher`（C10）、`p2-fetcher-always`（C11）。

## 执行顺序

### 泳道 A — Fetchers

1. **C12** `p2-fetcher-detected`（进行中）— retrieved fetcher → Codex 引用检测（依赖 C10/C11 已归档）

### 泳道 B — Memory 注入

2. **C13** `p2-memory-injection`（进行中）— settings fetcher → Memory previewInjection（依赖 P1.C2 已归档）

### 泳道 C — 故障修复优先

3. **F499** `issue-499-fix-kg-aliases-ipc-contract`（新增）— 修复 KG aliases 的 IPC 契约漂移，恢复 `knowledge:entity:list` runtime 校验通过

### 推荐执行序列

```text
F499（优先修复，阻断 Windows E2E）
C12（可与 C13 并行，依赖已归档）
C13（可与 C12 并行）
```

## 依赖关系总览

```text
C8 (kg-context-level, archived) ──┬──→ C10 (entity-matcher, archived) ──┐
C9 (kg-aliases, archived) ────────┘                                     ├──→ C12 (fetcher-detected)
C8 (kg-context-level, archived) ─────────────→ C11 (fetcher-always, archived) ┘
P1.C2 (assemble-prompt, archived) ───────────────────────────────────────────→ C13 (memory-injection)
C9 (kg-aliases, archived) ───────────────────────────────────────────────────→ F499 (ipc-contract fix)
```

### 跨泳道依赖明细

| 下游 change                                  | 上游依赖（跨泳道）                   | 依赖内容                                                                  |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| C12 `p2-fetcher-detected`                    | C10 `p2-entity-matcher`（已归档）    | `matchEntities` 函数                                                      |
| C12 `p2-fetcher-detected`                    | C11 `p2-fetcher-always`（已归档）    | `formatEntityForContext` 辅助函数                                         |
| C13 `p2-memory-injection`                    | P1.C2 `p1-assemble-prompt`（已归档） | `assembleSystemPrompt({ memoryOverlay })` 参数位                          |
| F499 `issue-499-fix-kg-aliases-ipc-contract` | C9 `p2-kg-aliases`（已归档）         | `KnowledgeEntity.aliases` 数据结构；IPC create/list/update 契约字段需同步 |

## 依赖说明

- C12/C13 的上游依赖均为 `NO_DRIFT` 已归档产物。
- F499 依赖同步检查结论为 `DRIFT_FOUND`：C9 增加的 `aliases` 未同步到 IPC contract，已在 F499 中修复。
- 任一活跃 change 发现漂移，必须先更新当前 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
