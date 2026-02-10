# 提案：ai-service-p2-panel-chat-apply-flow

## 背景

AI 面板与编辑器协作链路在主 spec 中已定义（聊天、空态、应用到编辑器/Inline Diff），但缺少以项目隔离为核心的契约分阶段交付草案，尤其是 `ai:chat:list/send/clear` 与应用链路的跨模块一致性需要明确。

## 变更内容

- 定义 `ai:chat:list`、`ai:chat:send`、`ai:chat:clear` 的项目隔离契约与错误处理。
- 固化 AI 面板结构（历史区/输出区/操作区/输入区）与空态文案要求。
- 定义「应用到编辑器」链路：AI 输出进入 Inline Diff，再由用户选择接受/拒绝。
- 补齐 Storybook 四态约束：默认/空/生成中/错误。

## 受影响模块

- AI Service（聊天与应用链路）
- Workbench（右侧 AI 面板容器）
- Editor（Inline Diff 契约）
- IPC（`ai:chat:*` 请求响应结构）

## 依赖关系

- 上游依赖：`ai-service-p1-streaming-cancel-lifecycle`（生成态与停止语义）。
- 下游依赖：
  - `ai-service-p3-judge-quality-pipeline`
  - `ai-service-p4-candidates-usage-stats`

## Dependency Sync Check

- 结论：`NO_DRIFT`
- 核对项：
  - 数据结构：`role/content/skillId/timestamp/traceId` 与 AI Service 主 spec 一致。
  - IPC 契约：`ai:chat:list|send|clear` 均为 Request-Response 且返回 `{ ok, data|error }`。
  - 错误码：复用 `CONFLICT`（应用冲突）、`AI_NOT_CONFIGURED`、`INTERNAL_ERROR`。
  - 阈值：不改变编辑器/面板现有性能阈值，仅补契约闭环。

## Out-of-scope

- Judge 规则体系与标签策略。
- 多候选方案策略与使用统计。

## 审阅状态

- Owner 审阅：`PENDING`
