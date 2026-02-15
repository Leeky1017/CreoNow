# Active Changes Execution Order

更新时间：2026-02-15 15:22

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **0**（Sprint 3 Wave W3 已交付并归档）。
- 执行模式：**无活跃执行拓扑**（等待下一批 change 激活）。
- 基线规则：
  - 新增活跃 change 后必须立即恢复本文件的拓扑维护。
  - 进入 Red 前必须完成 `依赖同步检查（Dependency Sync Check）`。
  - 任一上游契约漂移时，下游必须先更新 proposal/spec/tasks 再继续实现。

## 执行顺序

- 当前无活跃 change。

## 依赖说明

- Sprint 3 已归档结果（W1/W2/W3 全部完成）：
  - `s3-lint-ratchet`
  - `s3-kg-last-seen`
  - `s3-synopsis-skill`
  - `s3-trace-persistence`
  - `s3-onnx-runtime`
  - `s3-i18n-setup`
  - `s3-state-extraction`
  - `s3-synopsis-injection`
  - `s3-embedding-service`
  - `s3-entity-completion`
  - `s3-i18n-extract`
  - `s3-search-panel`
  - `s3-export`
  - `s3-p3-backlog-batch`
  - `s3-hybrid-rag`
  - `s3-zen-mode`
  - `s3-project-templates`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 活跃 change 数量或执行拓扑变化时，必须更新执行模式、顺序与更新时间。
- 未同步本文件时，不得宣称执行顺序已确认。
