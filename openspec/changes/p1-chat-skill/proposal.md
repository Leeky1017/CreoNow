# 提案：p1-chat-skill

## 背景

搜索整个 `skills/` 目录，不存在 `chat` / `ask` / `conversation` 等自由对话技能。用户能做的只有润色、续写、改写——全部是对已有文本的变换操作。当用户输入自由对话（如"帮我想一个悬疑小说的开头"），现有技能无法正确处理。

同时缺少意图路由：用户在 AI 面板输入文本后，系统无法自动推断目标技能，需手动选择。

审计来源：`docs/audit/01-system-prompt-and-identity.md` §3.3、§3.4

不改的风险：AI 面板仅支持文本变换操作，无法作为创作对话伙伴使用。

## 变更内容

- 创建 `apps/desktop/main/src/services/skills/skillRouter.ts`，导出 `inferSkillFromInput()` 函数
- 实现基于关键词匹配的意图路由规则：
  - 包含 "续写"/"写下去"/"继续写" → `builtin:continue`
  - 包含 "扩写"/"展开" → `builtin:expand`
  - 包含 "缩写"/"精简" → `builtin:condense`
  - 包含 "头脑风暴"/"帮我想" → `builtin:brainstorm`
  - 有选中文本且无输入 → `builtin:polish`
  - 有选中文本且短输入含改写关键词 → `builtin:rewrite`
  - 无匹配 → `builtin:chat`（默认）
- chat 技能作为默认对话技能，空输入时也路由到 chat

## 受影响模块

- skill-system delta：`openspec/changes/p1-chat-skill/specs/skill-system-delta.md`
- 实现文件：`apps/desktop/main/src/services/skills/skillRouter.ts`

## 不做什么

- 不创建 chat 技能的 SKILL.md 文件（技能定义文件由后续 Phase 3 统一管理）
- 不实现 LLM 意图分类（初期用关键词+启发式规则）
- 不涉及前端 UI 变更

## 依赖关系

- 上游依赖：无
- 下游依赖：无（独立泳道）

## Dependency Sync Check

- 核对输入：无上游依赖，N/A
- 结论：`N/A`

## Codex 实现指引

- 目标文件路径：`apps/desktop/main/src/services/skills/skillRouter.ts`
- 测试文件路径：`apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts`
- 验证命令：`pnpm vitest run apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts`
- Mock 要求：无外部依赖，纯函数测试

## 审阅状态

- Owner 审阅：`PENDING`
