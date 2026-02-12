# Active Changes Execution Order

更新时间：2026-02-13 02:40

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **6**（Phase 2 Codex 上下文）。
- 执行模式：**两条并行泳道 + 依赖串行**。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 已完成归档（Phase 1）：`p1-identity-template`、`p1-assemble-prompt`、`p1-chat-skill`、`p1-aistore-messages`、`p1-multiturn-assembly`、`p1-apikey-storage`、`p1-ai-settings-ui`。

## 执行顺序

### 泳道 A — KG 扩展 + Entity Matcher + Fetchers（串行）

1. **C8** `p2-kg-context-level`（0.5d）— KG `aiContextLevel` 字段
2. **C9** `p2-kg-aliases`（0.5d）— KG `aliases` 字段
3. **C10** `p2-entity-matcher`（1d）— 文本-实体匹配引擎（依赖 C8 + C9）
4. **C11** `p2-fetcher-always`（0.5d）— rules fetcher → KG Always 注入（依赖 C8）
5. **C12** `p2-fetcher-detected`（1d）— retrieved fetcher → Codex 引用检测（依赖 C10 + C11）

### 泳道 B — Memory 注入（可与泳道 A 并行）

6. **C13** `p2-memory-injection`（1d）— settings fetcher → Memory previewInjection（依赖 P1.C2）

### 推荐执行序列

```
C8 → C9 → C10 → C11 → C12（泳道 A 串行）
C13（泳道 B，可与 C8-C12 并行）
```

C8 和 C9 无相互依赖，可并行；但 C10 必须等 C8+C9 完成。C11 依赖 C8。C12 依赖 C10+C11。

## 依赖关系总览

```text
C8 (kg-context-level) ──┬──→ C10 (entity-matcher) ──→ C12 (fetcher-detected)
C9 (kg-aliases) ────────┘                              ↑
C8 (kg-context-level) ──→ C11 (fetcher-always) ────────┘
C13 (memory-injection) — 独立泳道（依赖 P1.C2，已归档）
```

### 跨泳道依赖明细

| 下游 change               | 上游依赖（跨泳道）                   | 依赖内容                                          |
| ------------------------- | ------------------------------------ | ------------------------------------------------- |
| C10 `p2-entity-matcher`   | C8 `p2-kg-context-level`             | `AiContextLevel` 类型定义                         |
| C10 `p2-entity-matcher`   | C9 `p2-kg-aliases`                   | `aliases: string[]` 字段定义                      |
| C11 `p2-fetcher-always`   | C8 `p2-kg-context-level`             | `entityList({ filter: { aiContextLevel } })` 接口 |
| C12 `p2-fetcher-detected` | C10 `p2-entity-matcher`              | `matchEntities` 函数                              |
| C12 `p2-fetcher-detected` | C11 `p2-fetcher-always`              | `formatEntityForContext` 辅助函数                 |
| C13 `p2-memory-injection` | P1.C2 `p1-assemble-prompt`（已归档） | `assembleSystemPrompt({ memoryOverlay })` 参数位  |

## 依赖说明

- 当新增 active change 且存在上游依赖时，进入 Red 前必须完成并落盘 Dependency Sync Check（至少核对数据结构、IPC 契约、错误码、阈值）。
- 若任一 active change 发现 `DRIFT`，必须先更新该 change 的 `proposal.md`、`specs/*`、`tasks.md`，再推进 Red/Green。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或拓扑变化时，必须更新执行模式、阶段顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
