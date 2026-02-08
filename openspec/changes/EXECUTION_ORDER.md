# Active Changes Execution Order

更新时间：2026-02-08 23:57

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **3**。
- 执行模式：**串行**（控制面按单队列推进，存在明确前置依赖）。

## 执行顺序

1. `memory-system-p2-panel-provenance`
2. `memory-system-p3-isolation-degradation`
3. `knowledge-graph-p2-auto-recognition-ai-utilization`

## 依赖说明

- `memory-system-p2-panel-provenance` 依赖已归档 change `archive/memory-system-p1-distillation-decay-conflict` 的语义记忆 CRUD、蒸馏进度与冲突输出。
- `memory-system-p3-isolation-degradation` 依赖 `memory-system-p2-panel-provenance` 的面板入口、作用域切换与用户确认交互。
- `knowledge-graph-p2-auto-recognition-ai-utilization` 依赖已归档 change `archive/knowledge-graph-p1-visualization-extended-views` 的面板入口与扩展视图 UI，并继承 `archive/knowledge-graph-p0-entity-relation-query` 的实体/关系与查询契约。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
