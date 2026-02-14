# Active Changes Execution Order

更新时间：2026-02-14 16:15

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **6**。
- 执行模式：**Sprint 1 剩余并行 + 依赖串行（Wave 2 → Wave 3）**。
- 关键约束：`s1-context-ipc-split` 已完成对 `s1-break-context-cycle` 的依赖同步检查；上游已在 `2026-02-14` 归档完成。

## 执行顺序

1. Wave 2（基础治理与 IPC 分层）
   - `s1-ipc-acl`
   - `s1-runtime-config`
   - `s1-context-ipc-split`（上游 `s1-break-context-cycle` 已完成）
2. Wave 3（服务提取并行）
   - `s1-doc-service-extract`
   - `s1-ai-service-extract`
   - `s1-kg-service-extract`

## 依赖说明

- 硬依赖：
  - `s1-context-ipc-split` ← `s1-break-context-cycle`（已满足，change 已归档）
- 建议依赖：
  - `s1-doc-service-extract`、`s1-ai-service-extract`、`s1-kg-service-extract` 建议在 `s1-path-alias` 后进入 Red，以降低路径迁移冲突（该前置已满足，change 已归档）。
- 所有 change 在进入 Red 前，必须在各自 `tasks.md` 与 RUN_LOG 落盘“依赖同步检查（Dependency Sync Check）”输入、核对项与结论（`NO_DRIFT` 或 `DRIFT` 更新动作）。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
