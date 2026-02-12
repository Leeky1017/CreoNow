# Active Changes Execution Order

<<<<<<< HEAD
<<<<<<< HEAD
更新时间：2026-02-12 23:06
=======
更新时间：2026-02-12 23:09
>>>>>>> abd6d52d (fix: complete p1-apikey-storage delivery closure (#470))
=======
更新时间：2026-02-12 23:09
>>>>>>> origin/task/470-p1-apikey-storage

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

<<<<<<< HEAD
<<<<<<< HEAD
- 当前活跃 change 数量为 **6**（Phase 1 进行中）。
- 执行模式：**双泳道并行 + 泳道内串行**。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 变更泳道（Phase 1）：
  - AI Service 泳道：`p1-identity-template → p1-assemble-prompt → p1-aistore-messages → p1-multiturn-assembly`
  - Workbench 泳道：`p1-apikey-storage → p1-ai-settings-ui`
=======
=======
>>>>>>> origin/task/470-p1-apikey-storage
- 当前活跃 change 数量为 **6**（Phase 1 持续推进）。
- 执行模式：**三泳道并行 + 泳道内串行**。
- 路线图：36-change × 6-Phase 计划（见 `docs/plans/audit-roadmap.md`）。
- 变更泳道（Phase 1）：
  - AI Service 泳道：`p1-identity-template → p1-assemble-prompt → p1-aistore-messages → p1-multiturn-assembly`
  - Skill System 泳道：`p1-chat-skill`（独立）
  - Workbench 泳道：`p1-ai-settings-ui`（上游 `p1-apikey-storage` 已归档完成）
<<<<<<< HEAD
>>>>>>> abd6d52d (fix: complete p1-apikey-storage delivery closure (#470))
=======
>>>>>>> origin/task/470-p1-apikey-storage

## 执行顺序

### 阶段 A — 起步项并行

1. `p1-identity-template`（ai-service，无依赖）
<<<<<<< HEAD
2. `p1-apikey-storage`（workbench，无依赖）

### 阶段 B — 中段推进

3. `p1-assemble-prompt`（ai-service，依赖 `p1-identity-template`）
4. `p1-ai-settings-ui`（workbench，依赖 `p1-apikey-storage`）
=======
2. `p1-chat-skill`（skill-system，无依赖）
3. `p1-ai-settings-ui`（workbench，依赖 `p1-apikey-storage`，依赖已满足）

### 阶段 B — 中段推进

4. `p1-assemble-prompt`（ai-service，依赖 `p1-identity-template`）
<<<<<<< HEAD
>>>>>>> abd6d52d (fix: complete p1-apikey-storage delivery closure (#470))
=======
>>>>>>> origin/task/470-p1-apikey-storage

### 阶段 C — 多轮对话

5. `p1-aistore-messages`（ai-service，依赖 `p1-assemble-prompt`）
6. `p1-multiturn-assembly`（ai-service，依赖 `p1-aistore-messages`）

## 依赖关系总览

```
AI Service 泳道:    p1-identity-template ──→ p1-assemble-prompt ──→ p1-aistore-messages ──→ p1-multiturn-assembly
<<<<<<< HEAD
<<<<<<< HEAD
Workbench 泳道:     p1-apikey-storage ──→ p1-ai-settings-ui
=======
Skill System 泳道:  p1-chat-skill
Workbench 泳道:     p1-ai-settings-ui（依赖已由归档 change `p1-apikey-storage` 提供）
>>>>>>> abd6d52d (fix: complete p1-apikey-storage delivery closure (#470))
=======
Skill System 泳道:  p1-chat-skill
Workbench 泳道:     p1-ai-settings-ui（依赖已由归档 change `p1-apikey-storage` 提供）
>>>>>>> origin/task/470-p1-apikey-storage
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
