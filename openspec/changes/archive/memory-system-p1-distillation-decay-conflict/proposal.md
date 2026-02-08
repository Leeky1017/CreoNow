# 提案：memory-system-p1-distillation-decay-conflict

## 背景

MS-1 已提供情景记忆的基础数据层，但语义记忆蒸馏、生命周期衰减与冲突解决仍缺失。
若不补齐该阶段，Memory System 无法将 episode 转化为稳定偏好规则，也无法控制记忆质量和增长边界。

本 change 依赖 `memory-system-p0-architecture-episodic-storage` 的数据模型与持久化接口，必须在 MS-1 合入后进入实现。

## 变更内容

- 定义语义记忆蒸馏流程：聚类分析 → 模式提取 → 自然语言规则生成。
- 固化蒸馏触发条件：批量（50）、空闲（5 分钟）、手动、冲突。
- 规定蒸馏调用 LLM，测试环境必须 mock。
- 定义衰减纯函数与分级处理：`decay = min(1.0, baseDecay × recallBoost × importanceBoost)`。
- 定义压缩策略：待压缩 episode 生成约 200 tokens 摘要并丢弃高成本原文细节。
- 定义冲突检测与解决边界：时间迁移、作用域重叠自动处理；直接矛盾需用户确认。
- 增加语义记忆 IPC 契约与蒸馏进度推送：`memory:semantic:*`、`memory:distill:progress`。

## 受影响模块

- Memory System spec delta：`openspec/changes/memory-system-p1-distillation-decay-conflict/specs/memory-system-delta.md`
- Main（后续实现阶段）：`apps/desktop/main/src/services/memory/`
- IPC（后续实现阶段）：`apps/desktop/main/src/ipc/memory.ts`

## 不做什么

- 不实现记忆面板 UI 与溯源展示。
- 不实现作用域清除与隔离操作。
- 不实现完整降级策略面板提示。

## 审阅状态

- Owner 审阅：`APPROVED`（Issue #306，2026-02-08）
