# 提案：memory-system-p3-isolation-degradation

## 背景

MS-3 已定义用户可见的面板与溯源能力，但“作用域隔离”和“故障降级”尚未形成完整可执行规范。
缺失该阶段会导致跨项目记忆污染风险、清理操作不可控、以及记忆子系统故障时主流程不确定。

本 change 依赖 `memory-system-p2-panel-provenance` 的面板入口与交互，必须在 MS-3 合入后进入实现。

## 变更内容

- 定义记忆作用域优先级：`project > global`。
- 定义作用域提升能力：项目级规则可提升为全局级。
- 定义清除粒度：项目级清除、全量清除（均需二次确认）。
- 定义记忆系统 4 档降级策略与触发边界。
- 增加隔离与清除相关 IPC 契约：`memory:clear:project`、`memory:clear:all`、`memory:promote`。
- 将“蒸馏调用失败触发降级”纳入可测试故障路径。

## 受影响模块

- Memory System spec delta：`openspec/changes/memory-system-p3-isolation-degradation/specs/memory-system-delta.md`
- Renderer（后续实现阶段）：`apps/desktop/renderer/src/features/memory/`
- Main（后续实现阶段）：`apps/desktop/main/src/services/memory/`
- IPC（后续实现阶段）：`apps/desktop/main/src/ipc/memory.ts`

## 不做什么

- 不实现 Context Engine 注入层的细节联动改造。
- 不实现 AI Service 上游调用链路改造。
- 不新增独立 UI 模块（沿用 MS-3 面板入口）。

## 审阅状态

- Owner 审阅：`PENDING`
