# 提案：ai-service-p4-candidates-usage-stats

## 背景

AI 多候选方案与使用统计在主 spec 中为独立 Requirement，但当前缺少可执行的组合 change，导致候选数量配置、负反馈写回记忆系统、token/费用展示难以统一验收。

## 变更内容

- 固化候选方案数量配置（1-5）与卡片展示/选择应用契约。
- 定义「全部不满意，重新生成」动作与强负反馈写入记忆系统接口约束。
- 固化 token 统计与可选费用显示字段，明确无价格配置时隐藏费用。

## 受影响模块

- AI Service（候选生成与统计聚合）
- Memory System（负反馈写入接口约束）
- AI 面板（候选卡片与统计栏展示）

## 依赖关系

- 上游依赖：`ai-service-p2-panel-chat-apply-flow`（面板结构与应用链路）。
- 并行关系：可与 `ai-service-p3-judge-quality-pipeline` 并行。
- 下游依赖：`ai-service-p5-failover-quota-hardening`（容量与阈值整合）。

## Dependency Sync Check

- 结论：`NO_DRIFT`
- 核对项：
  - 数据结构：候选数量范围 `1..5`、会话 token 统计字段与主 spec 对齐。
  - IPC 契约：候选与统计渲染依赖的 `ai:chat:send` 返回 metadata 字段可扩展。
  - 错误码：超限与限流复用 AI 领域错误码，不新增冲突码。
  - 阈值：不改变 token 上限 200,000，仅定义展示与聚合口径。

## Out-of-scope

- provider 健康探测与自动降级切换机制。

## 审阅状态

- Owner 审阅：`PENDING`
