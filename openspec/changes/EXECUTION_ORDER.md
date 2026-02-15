# Active Changes Execution Order

更新时间：2026-02-15 09:32

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **17**（Sprint 3 全量 change 已起草，待实施）。
- 执行模式：**Wave 并行 + 依赖串行门禁**。
- 基线规则：
  - 每个 wave 内允许并行推进独立 change。
  - 进入 Red 前必须完成 `依赖同步检查（Dependency Sync Check）`。
  - 任一上游契约漂移时，下游必须先更新 proposal/spec/tasks 再继续实现。

## 执行顺序

1. **Wave W1（6 并行，优先打基础）**
   - `s3-lint-ratchet`
   - `s3-kg-last-seen`
   - `s3-synopsis-skill`
   - `s3-trace-persistence`
   - `s3-onnx-runtime`
   - `s3-i18n-setup`

2. **Wave W2（8 并行，依赖 W1 解锁）**
   - `s3-state-extraction`（依赖 `s3-kg-last-seen`）
   - `s3-synopsis-injection`（依赖 `s3-synopsis-skill`）
   - `s3-embedding-service`（依赖 `s3-onnx-runtime`）
   - `s3-entity-completion`（依赖 Sprint2 `s2-kg-context-level` 既有能力）
   - `s3-i18n-extract`（依赖 `s3-i18n-setup`）
   - `s3-search-panel`（独立）
   - `s3-export`（独立）
   - `s3-p3-backlog-batch`（独立，可与任意 wave 穿插）

3. **Wave W3（3 并行，收束高层能力）**
   - `s3-hybrid-rag`（依赖 `s3-embedding-service`，并受 `s3-onnx-runtime` 质量基线影响）
   - `s3-zen-mode`（独立）
   - `s3-project-templates`（独立）

## 依赖说明

- Sprint 3 关键串行链：
  - `s3-kg-last-seen` → `s3-state-extraction`
  - `s3-synopsis-skill` → `s3-synopsis-injection`
  - `s3-onnx-runtime` → `s3-embedding-service` → `s3-hybrid-rag`
  - `s3-i18n-setup` → `s3-i18n-extract`
- 跨 Sprint 依赖：
  - `s3-entity-completion` 依赖已归档 `s2-kg-context-level`。
- 治理优先级：
  - `s3-lint-ratchet` 建议优先于大批量改动（特别是 `s3-p3-backlog-batch`）落地，降低回退风险。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
