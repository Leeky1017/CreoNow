# Active Changes Execution Order

更新时间：2026-02-08 21:46

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **8**。
- 执行模式：**串行**（控制面按单队列推进，存在明确前置依赖）。

## 执行顺序

1. `memory-system-p1-distillation-decay-conflict`
2. `memory-system-p2-panel-provenance`
3. `memory-system-p3-isolation-degradation`
4. `project-management-p0-creation-metadata-dashboard`
5. `project-management-p1-lifecycle-switch-delete`
6. `knowledge-graph-p0-entity-relation-query`
7. `knowledge-graph-p1-visualization-extended-views`
8. `knowledge-graph-p2-auto-recognition-ai-utilization`

## 依赖说明

- `memory-system-p1-distillation-decay-conflict` 依赖已归档 change `archive/memory-system-p0-architecture-episodic-storage` 的三层数据模型与 episode 存储契约。
- `memory-system-p2-panel-provenance` 依赖 `memory-system-p1-distillation-decay-conflict` 的语义记忆 CRUD、蒸馏进度与冲突输出。
- `memory-system-p3-isolation-degradation` 依赖 `memory-system-p2-panel-provenance` 的面板入口、作用域切换与用户确认交互。
- `project-management-p1-lifecycle-switch-delete` 依赖 `project-management-p0-creation-metadata-dashboard` 的项目数据模型、IPC 命名与 schema 基线。
- `knowledge-graph-p1-visualization-extended-views` 依赖 `knowledge-graph-p0-entity-relation-query` 的实体/关系 CRUD、查询契约与容量保护。
- `knowledge-graph-p2-auto-recognition-ai-utilization` 依赖 `knowledge-graph-p1-visualization-extended-views` 的面板入口与建议卡 UI 承载能力。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
