# 提案：ai-service-p3-judge-quality-pipeline

## 背景

主 spec 定义了 Judge 的维度与降级原则，但缺少契约层面的阶段化变更文档，尤其是 `judge:evaluate` / `judge:result` 消息结构、严重度标签、降级标记语义尚未单独收口。

## 变更内容

- 固化 `judge:quality:evaluate` 与 `judge:quality:result` 的输入输出契约。
- 统一高/中/低严重度维度与标签反馈结构。
- 明确高级判定不可用时的规则引擎兜底与“部分校验已跳过”反馈。
- 对 Judge 执行时机（生成完成后异步）与非阻塞原则做阶段边界说明。

## 受影响模块

- AI Service（Judge 管道）
- IPC（`judge:*` 通道结构）
- Workbench/AI 面板（Judge 标签渲染）

## 依赖关系

- 上游依赖：`ai-service-p2-panel-chat-apply-flow`（面板展示位与消息上下文）。
- 下游依赖：`ai-service-p5-failover-quota-hardening`（异常矩阵与降级整合）。

## Dependency Sync Check

- 结论：`NO_DRIFT`
- 核对项：
  - 数据结构：Judge 维度（约束/角色/风格/连贯/重复）与主 spec 对齐。
  - IPC 契约：`judge:quality:evaluate` Request-Response、`judge:quality:result` Push Notification。
  - 错误码：高级判定失败不覆盖主流程成功态，降级标记可判定。
  - 阈值：Judge 基础规则评估 p95 < 300ms 不变。

## Out-of-scope

- provider 失败切换策略。
- 会话额度与配额治理。

## 审阅状态

- Owner 审阅：`PENDING`
