# 提案：aud-h6a-main-service-decomposition

## Why（问题与目标）

在 Wave2 前，`aiService.ts` 中混杂了大量与“服务编排/上游调用”无关的 payload 解析与提取逻辑（OpenAI/Anthropic 文本提取、模型目录解析、provider 展示名等）。这会导致：

- 纯函数逻辑难以隔离回归（需要构造 service/IPC harness 才能覆盖边界输入）。
- 对输入 shape 的容错语义容易发生 silent drift（`content` 数组形态、`delta` 流式 shape、`/v1/models` 重复/排序等）。
- 审计难以用最小证据证明“行为等价 + 可回归”。

本 change 的目标是在不改变对外 IPC 语义的前提下，将这些纯函数逻辑拆分为独立 helper 模块，并用最小单元测试锁定行为。

## What（交付内容）

- 抽取 `apps/desktop/main/src/services/ai/aiPayloadParsers.ts`，沉淀稳定 helper API：
  - `extractOpenAiText` / `extractOpenAiDelta` / `extractOpenAiContentText`
  - `extractAnthropicText` / `extractAnthropicDelta`
  - `extractOpenAiModels`
  - `providerDisplayName`
- `aiService.ts` 复用 helper（服务层仅负责编排、上游调用与错误映射）。
- 新增 Wave2 回归测试：`apps/desktop/main/src/services/ai/__tests__/ai-payload-parsers.test.ts`
  - 覆盖 Scenario `AIS-AUD-H6A-S1`（对应测试注释 tag：`H6A-S1`）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h6a-main-service-decomposition/specs/ai-service/spec.md`
- Tests（evidence）:
  - `apps/desktop/main/src/services/ai/__tests__/ai-payload-parsers.test.ts`

## Out of Scope（不做什么）

- 不引入新的 provider/endpoint/错误码体系。
- 不在本 change 内推进更大范围的 AI service 目录重组（仅限 payload helper 拆分）。

## Evidence（可追溯证据）

- Wave2 RUN_LOG：`openspec/_ops/task_runs/ISSUE-593.md`
- Wave2 PR：https://github.com/Leeky1017/CreoNow/pull/594

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
