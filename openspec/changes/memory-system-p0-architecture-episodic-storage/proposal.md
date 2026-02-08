# 提案：memory-system-p0-architecture-episodic-storage

## 背景

Memory System 主 spec 已定义三层记忆架构、情景记忆记录与存储淘汰规则，但当前缺少可实施的基础数据模型与持久化契约。
若不先完成 P0 数据层，后续蒸馏、衰减、冲突与面板能力将无法形成稳定依赖，且无法保证跨进程 IPC 与容量约束的一致性。

## 变更内容

- 建立三层记忆基础数据结构：工作记忆（内存）、情景记忆（SQLite）、语义记忆（只定义预算与引用位）。
- 定义工作记忆 Zustand store 结构，明确 8K token 上限与重要性裁剪行为。
- 定义情景记忆 SQLite schema、索引策略与读写接口。
- 增加隐式反馈提取纯函数：覆盖 6 类信号及可测试的权重映射。
- 固化存储预算：工作记忆 8K tokens、情景活跃 1000、压缩 5000、语义 200。
- 定义清理调度接口（实时/每日/每周/每月），当前以 manual trigger 执行，不引入 cron。
- 增加 IPC 通道规范：`memory:episode:record`（Fire-and-Forget）、`memory:episode:query`（Request-Response）。

## 受影响模块

- Memory System spec delta：`openspec/changes/memory-system-p0-architecture-episodic-storage/specs/memory-system-delta.md`
- Main（后续实现阶段）：`apps/desktop/main/src/services/memory/`
- Renderer（后续实现阶段）：`apps/desktop/renderer/src/stores/memoryStore.ts`
- IPC（后续实现阶段）：`apps/desktop/main/src/ipc/memory.ts`

## 不做什么

- 不实现语义记忆蒸馏流程与 LLM 调用。
- 不实现衰减公式、冲突检测与解决策略。
- 不实现记忆面板 UI 与溯源 UI。
- 不实现完整多档降级策略（仅定义检索失败时的最小回退行为）。

## 审阅状态

- Owner 审阅：`PENDING`
