# 提案：p1-assemble-prompt

## 背景

当前 `aiService.ts` 的 `combineSystemText` 仅拼接两部分——技能级 systemPrompt 和动态 overlay，无固定层级顺序，且可能返回 `null`。参考 Cursor/Manus 的最佳实践（身份 → 规则 → 技能 → 模式 → 记忆 → 上下文），需要改造为分层组装函数，确保全局身份始终在最前面。

审计来源：`docs/audit/01-system-prompt-and-identity.md` §3.2

不改的风险：系统提示词无稳定层级结构，AI 行为不可预测；`null` 返回导致 LLM 无角色定义。

## 变更内容

- 创建 `apps/desktop/main/src/services/ai/assembleSystemPrompt.ts`，导出 `assembleSystemPrompt()` 函数
- 支持 6 层分层组装：`globalIdentity`（必选）→ `userRules` → `skillSystemPrompt` → `modeHint` → `memoryOverlay` → `contextOverlay`
- `globalIdentity` 为必选参数，缺失时函数行为需明确（当前实现始终要求传入，不抛错但 globalIdentity 为空字符串时结果仅包含非空层）
- 缺省的可选层直接跳过，不产生空行或占位符
- 各层以 `\n\n` 分隔

## 受影响模块

- ai-service delta：`openspec/changes/p1-assemble-prompt/specs/ai-service-delta.md`
- 实现文件：`apps/desktop/main/src/services/ai/assembleSystemPrompt.ts`

## 不做什么

- 不修改现有 `combineSystemText`（保留兼容，后续废弃）
- 不实现 Context Engine fetcher 真实数据源（Phase 2）
- 不涉及前端 UI

## 依赖关系

- 上游依赖：`p1-identity-template`（提供 `GLOBAL_IDENTITY_PROMPT` 作为 globalIdentity 输入）
- 下游依赖：`p1-aistore-messages`（C4）、`p1-multiturn-assembly`（C5）

## Dependency Sync Check

- 核对输入：`p1-identity-template` 的 `GLOBAL_IDENTITY_PROMPT` 导出
- 核对项：
  - 数据结构：`GLOBAL_IDENTITY_PROMPT` 为 `string` 类型常量 ✓
  - IPC 契约：不涉及 IPC ✓
  - 错误码：不涉及 ✓
  - 阈值：不涉及 ✓
- 结论：`NO_DRIFT`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/ai/assembleSystemPrompt.ts`
- 测试文件路径：`apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`
- Mock 要求：无外部依赖，纯函数测试

## 审阅状态

- Owner 审阅：`PENDING`
