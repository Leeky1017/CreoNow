# 提案：p1-identity-template

## 背景

当前 `aiService.ts` 的 `combineSystemText` 仅拼接技能级 `systemPrompt` 和动态 `system` overlay，不存在始终注入的全局 AI 身份提示词。当技能未定义 systemPrompt 且无动态 overlay 时，系统提示词为 `null`，LLM 没有任何角色定义。

审计来源：`docs/audit/01-system-prompt-and-identity.md` §3.1

不改的风险：AI 无写作专业素养，无角色流动能力，在自由对话场景下表现为通用 chatbot。

## 变更内容

- 创建 `apps/desktop/main/src/services/ai/identityPrompt.ts`，导出 `GLOBAL_IDENTITY_PROMPT` 常量
- 模板包含 5 个 XML 区块：`<identity>`、`<writing_awareness>`、`<role_fluidity>`、`<behavior>`、`<context_awareness>`
- 写作素养区块包含叙事结构、角色塑造、Show don't tell 等核心概念
- 角色流动区块定义 ghostwriter / muse / editor / actor / painter 五个角色

## 受影响模块

- ai-service delta：`openspec/changes/p1-identity-template/specs/ai-service-delta.md`
- 实现文件：`apps/desktop/main/src/services/ai/identityPrompt.ts`

## 不做什么

- 不改造 `combineSystemText`（由 C2 负责）
- 不实现动态上下文注入（由后续 Phase 2 负责）
- 不涉及前端 UI 变更

## 依赖关系

- 上游依赖：无
- 下游依赖：`p1-assemble-prompt`（C2 使用本模板作为 identity 层输入）

## Dependency Sync Check

- 核对输入：无上游依赖，N/A
- 结论：`N/A`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/ai/identityPrompt.ts`
- 测试文件路径：`apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/ai/__tests__/identityPrompt.test.ts`
- Mock 要求：无外部依赖，纯函数/常量测试

## 审阅状态

- Owner 审阅：`PENDING`
