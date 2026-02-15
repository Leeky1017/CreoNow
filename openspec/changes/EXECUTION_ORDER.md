# Active Changes Execution Order

更新时间：2026-02-15 11:41

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **3**（Sprint 3 Wave W1/W2 已交付并归档，待执行 W3）。
- 执行模式：**Wave 并行 + 依赖串行门禁**。
- 基线规则：
  - 每个 wave 内允许并行推进独立 change。
  - 进入 Red 前必须完成 `依赖同步检查（Dependency Sync Check）`。
  - 任一上游契约漂移时，下游必须先更新 proposal/spec/tasks 再继续实现。

## 执行顺序

1. **Wave W3（3 并行，收束高层能力）**
   - `s3-hybrid-rag`（依赖 `s3-embedding-service`，并受 `s3-onnx-runtime` 质量基线影响）
   - `s3-zen-mode`（独立）
   - `s3-project-templates`（独立）

## 依赖说明

- Sprint 3 已归档结果（本次完成 W2）：
  - `s3-state-extraction`
  - `s3-synopsis-injection`
  - `s3-embedding-service`
  - `s3-entity-completion`
  - `s3-i18n-extract`
  - `s3-search-panel`
  - `s3-export`
  - `s3-p3-backlog-batch`
- Sprint 3 关键串行链（当前生效）：
  - `s3-hybrid-rag` 依赖已归档 `s3-embedding-service` 与 `s3-onnx-runtime` 基线。
- 治理优先级：
  - 进入 W3 前，保持 W1/W2 归档结果不可回退。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
