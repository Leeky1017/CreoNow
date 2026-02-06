# Design 01 — AI Pipeline（AI 链路）

## Scope

- CNAUD-REQ-001
- CNAUD-REQ-002
- CNAUD-REQ-003
- CNAUD-REQ-017
- CNAUD-REQ-018
- CNAUD-REQ-019
- CNAUD-REQ-023
- CNAUD-REQ-037
- CNAUD-REQ-038

## Current-State Evidence

- aiService 仍存在 model: fake 与 Anthropic max_tokens: 256 硬编码。
- ModelPicker/ModePicker 仅存在于 AiPanel 本地 state，未进入 store/IPC/service。
- aiStore stream 流程没有 renderer watchdog，running 可能悬挂。
- feedback 路径返回 recorded: true，但无持久化写入。
- ChatHistory 与 SearchPanel 含 mock 数据和硬编码性能文案。
- AiPanel 内嵌 style block。

## Target Architecture

1. AI Request Envelope SSOT
   - ai:skill:run 请求必须支持 model 与 mode。
   - aiStore 持有 selectedModel/selectedMode，而非 AiPanel 本地 state。

2. Execution Safety
   - main timeout 负责上游请求超时。
   - renderer watchdog 负责流事件丢失兜底。

3. Feedback Durability
   - recorded=true 必须可落证据（DB/event log）。
   - 写入失败必须返回稳定错误码（DB_ERROR）。

4. Truthful UI
   - 历史/搜索面板不得默认 mock fallback。
   - 未实现能力必须显式 placeholder。

5. Style Hygiene
   - 动画与关键帧迁移到样式层。

## Contract Changes

- ai:skill:run.request 新增 model 与 mode。
- ai:skill:run.response 保持 ok true/false envelope，不破坏已有调用方。

## Failure Semantics

- 无效模型：INVALID_ARGUMENT
- 不支持 mode：UNSUPPORTED
- stream watchdog 超时：TIMEOUT
- feedback 写入失败：DB_ERROR

## Verification Gates

- unit: ai upstream payload 与错误映射。
- integration: IPC schema 校验（request/response）。
- ui: model/mode 选择可影响下游行为。
- e2e: stream 异常下不会永久 running。
