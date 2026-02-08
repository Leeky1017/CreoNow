# Active Changes Execution Order

更新时间：2026-02-08 19:55

适用范围：openspec/changes/ 下所有非 archive/、非 _template/ 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **4**。
- 执行模式：**串行**（存在明确前置依赖）。

## 执行顺序

1. memory-system-p0-architecture-episodic-storage
2. memory-system-p1-distillation-decay-conflict
3. memory-system-p2-panel-provenance
4. memory-system-p3-isolation-degradation

## 依赖说明

- memory-system-p1-distillation-decay-conflict 依赖 memory-system-p0-architecture-episodic-storage 的三层数据模型与 episode 存储契约。
- memory-system-p2-panel-provenance 依赖 memory-system-p1-distillation-decay-conflict 的语义记忆 CRUD、蒸馏进度与冲突输出。
- memory-system-p3-isolation-degradation 依赖 memory-system-p2-panel-provenance 的面板入口、作用域切换与用户确认交互。

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 未同步更新本文件时，不得宣称执行顺序已确认。
