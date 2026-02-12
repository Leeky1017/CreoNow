# Phase 1 Agent 指令：AI 可用（7 Changes）

## 角色分工

| 角色 | 模型 | 职责 | 禁止 |
|------|------|------|------|
| **规划 Agent（你）** | Opus | 编写 change 文档（proposal.md + tasks.md） | 禁止写任何代码 |
| **实现 Agent** | Codex | 按 change 文档执行 TDD 实现 | 禁止修改 spec/proposal |

你的唯一交付物是 **7 组 change 文档**，不涉及任何代码实现。

## 必读文件

| 顺序 | 文件 | 目的 |
|------|------|------|
| 1 | `AGENTS.md` | 规则和禁止行为 |
| 2 | `openspec/project.md` | 项目概述和模块索引 |
| 3 | `docs/plans/audit-roadmap.md` | 36-change 路线图 |
| 4 | `openspec/specs/ai-service/spec.md` | C1/C2/C4/C5 目标 spec |
| 5 | `openspec/specs/skill-system/spec.md` | C3 目标 spec |
| 6 | `openspec/specs/workbench/spec.md` | C6/C7 目标 spec |
| 7 | `docs/audit/01-system-prompt-and-identity.md` | §3.1-§3.3 方案 |
| 8 | `docs/audit/02-conversation-and-context.md` | §3.1-§3.2 方案 |
| 9 | `docs/audit/06-onboarding-ux-config.md` | §3.1 方案 |

代码文件（理解现有实现以确保 spec 准确性）：
- `apps/desktop/main/src/services/ai/` — AI 服务现状
- `apps/desktop/main/src/services/skill/` — 技能系统现状
- `apps/desktop/renderer/src/stores/aiStore.ts` — AI store 现状

## 执行流程

```
对每个 change (C1-C7)：
1. 阅读目标模块的 spec.md，理解现有 requirements 和 scenarios
2. 阅读对应审计报告章节，理解问题和建议方案
3. 阅读相关代码文件，确认现有实现状态
4. 创建 openspec/changes/<change-id>/proposal.md (delta spec)
5. 创建 openspec/changes/<change-id>/tasks.md (TDD 六段式，仅填写 1-2 段)
6. 同步更新 openspec/changes/EXECUTION_ORDER.md
```

全部 7 个 change 文档完成后，执行二次核对和三次核对（见下方）。

## 交付物格式

### proposal.md

```markdown
# Change: <change-id>

## 目标 Spec
`openspec/specs/<module>/spec.md`

## 审计来源
`docs/audit/<report>.md` §<section>

## Delta

### [ADDED] REQ-XXX-YYY: <requirement 标题>
<requirement 完整描述>

### [ADDED] Scenario: <scenario 标题>
GIVEN <精确前提，含具体数据>
WHEN <触发动作，含函数签名>
THEN <期望结果，含类型和值断言>

## Codex 实现指引
- 目标文件路径: <具体路径>
- 验证命令: <pnpm vitest run ...>
- Mock 要求: <需要 mock 什么>
```

### tasks.md（仅填写 §1-§2，§3-§6 留空由 Codex 填写）

```markdown
# Tasks: <change-id>

## 1. Specification
引用 proposal.md 中的 requirements 和 scenarios。

## 2. TDD Mapping（先测前提）
| Scenario | 测试文件 | 测试用例名 | 断言要点 |
|----------|---------|-----------|----------|
| S1: xxx  | xxx.test.ts | should xxx | expect(xxx).toBe(xxx) |

## 3. Red（先写失败测试）
<!-- Codex 填写：测试代码 + 失败截图 -->

## 4. Green（最小实现通过）
<!-- Codex 填写：实现代码 + 通过截图 -->

## 5. Refactor（保持绿灯）
<!-- Codex 填写 -->

## 6. Evidence
<!-- Codex 填写：最终测试通过截图 + CI 链接 -->
```

## 二次核对（第一轮完成后）

全部 7 个 change 文档写完后，逐一执行以下检查：

| # | 检查项 | 方法 |
|---|--------|------|
| 1 | **Requirement ID 唯一** | 搜索所有 proposal.md，确认无重复 REQ-ID |
| 2 | **Scenario 完整** | 每个 REQ 至少有 1 个 Scenario 覆盖 |
| 3 | **Scenario 精确** | 每个 GIVEN/WHEN/THEN 包含具体数据值，无模糊描述 |
| 4 | **依赖正确** | 前置依赖的 change 确实提供了被依赖的能力 |
| 5 | **目标 spec 存在** | 引用的 spec.md 路径存在且包含被 MODIFIED 的 REQ |
| 6 | **现有代码对齐** | Scope 中提到的函数/文件确实存在于当前代码中 |
| 7 | **TDD Mapping 完整** | 每个 Scenario 在 tasks.md §2 中有对应测试用例 |
| 8 | **EXECUTION_ORDER 同步** | 所有 7 个 change 都在 EXECUTION_ORDER.md 中 |

发现问题立即修复，然后进入三次核对。

## 三次核对（二次核对修复后）

换一个视角重新审视：

| # | 检查项 | 方法 |
|---|--------|------|
| 1 | **Codex 可独立执行** | 仅凭 proposal.md + tasks.md，不看审计报告，Codex 能否无歧义地实现？ |
| 2 | **边界条件覆盖** | 每个 Scenario 集合是否覆盖了：空输入、超限输入、无效输入、正常路径？ |
| 3 | **跨 change 一致性** | C1 定义的类型/接口，C2 引用时是否一致？C4 的 ChatMessage 类型，C5 使用时字段是否对齐？ |
| 4 | **与现有 spec 不冲突** | 新增的 REQ-ID 不与现有 spec 中的 REQ-ID 冲突 |
| 5 | **审计建议全覆盖** | 对照审计报告对应章节，所有建议是否都在 change 中体现？遗漏了什么？ |

---

## C1: `p1-identity-template`（0.5d）

**模块**: ai-service
**审计来源**: `01-system-prompt-and-identity.md` §3.1

### Scope

创建 `apps/desktop/main/src/services/ai/identityTemplate.ts`，导出 `getIdentityTemplate()` 函数，返回包含 5 个 XML 区块的身份提示词字符串。

### Delta Spec（写入 `ai-service/spec.md`）

```
[ADDED] REQ-AIS-IDENTITY
AI 服务必须提供全局身份提示词模板，包含以下 5 个 XML 区块：
- <identity>: 核心身份定义（AI 创作伙伴）
- <writing_awareness>: 写作专业素养（叙事结构、角色塑造、场景描写、对白节奏、Show don't tell）
- <role_fluidity>: 角色流动定义（ghostwriter/muse/editor/actor/painter 及切换规则）
- <behavior>: 行为约束（尊重创作者意图、不主动改变叙事方向）
- <context_awareness>: 上下文感知声明（后续层注入的占位说明）
```

### Scenario（精确）

**S1: 模板包含五个 XML 区块**
```
GIVEN 调用 getIdentityTemplate()
WHEN 返回 result

THEN typeof result === "string"
AND result 包含 "<identity>" 和 "</identity>"
AND result 包含 "<writing_awareness>" 和 "</writing_awareness>"
AND result 包含 "<role_fluidity>" 和 "</role_fluidity>"
AND result 包含 "<behavior>" 和 "</behavior>"
AND result 包含 "<context_awareness>" 和 "</context_awareness>"
```

**S2: 写作素养区块包含核心概念**
```
GIVEN 调用 getIdentityTemplate()
WHEN 提取 <writing_awareness> 区块内容

THEN 内容包含 "叙事结构" 或 "narrative structure"
AND 内容包含 "角色塑造" 或 "characterization"
AND 内容包含 "Show don't tell" 或 "展示而非叙述"
```

**S3: 角色流动区块定义五个角色**
```
GIVEN 调用 getIdentityTemplate()
WHEN 提取 <role_fluidity> 区块内容

THEN 内容包含 "ghostwriter"
AND 内容包含 "muse"
AND 内容包含 "editor"
AND 内容包含 "actor"
AND 内容包含 "painter"
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/ai/__tests__/identityTemplate.test.ts`

---

## C2: `p1-assemble-prompt`（1d）

**模块**: ai-service
**审计来源**: `01-system-prompt-and-identity.md` §3.2
**前置依赖**: C1

### Scope

改造现有 `combineSystemText` 为 `assembleSystemPrompt`，支持分层组装。

### Delta Spec

```
[MODIFIED] REQ-AIS-PROMPT-ASSEMBLY (原 combineSystemText 相关)
系统提示词必须按固定顺序分层组装：
  1. identity — 身份模板（必选）
  2. rules — 用户/项目规则（可选）
  3. skill — 当前技能 system prompt（可选）
  4. memory — 记忆注入（可选）
  5. context — 上下文信息（可选）
缺省的层直接跳过，不产生空行或占位符。
```

### Scenario

**S1: 全层组装顺序正确**
```
GIVEN params = {
  identity: "<identity>AI</identity>",
  rules: "规则：不写暴力内容",
  skill: "你是续写助手，从光标处继续写作",
  memory: "用户偏好：简洁风格",
  context: "当前角色：林默正在调查案件"
}
WHEN 调用 assembleSystemPrompt(params)

THEN result.indexOf("<identity>") < result.indexOf("规则")
AND result.indexOf("规则") < result.indexOf("续写助手")
AND result.indexOf("续写助手") < result.indexOf("简洁风格")
AND result.indexOf("简洁风格") < result.indexOf("林默")
```

**S2: 缺省层跳过**
```
GIVEN params = {
  identity: "<identity>AI</identity>",
  skill: undefined,
  memory: undefined,
  rules: undefined,
  context: undefined
}
WHEN 调用 assembleSystemPrompt(params)

THEN result === "<identity>AI</identity>"
AND result 不包含连续两个换行符（无空层残留）
```

**S3: identity 为必选参数**
```
GIVEN params = { identity: undefined }
WHEN 调用 assembleSystemPrompt(params)

THEN 抛出错误，错误信息包含 "identity"
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/ai/__tests__/assembleSystemPrompt.test.ts`

---

## C3: `p1-chat-skill`（0.5d）

**模块**: skill-system
**审计来源**: `01-system-prompt-and-identity.md` §3.3, §3.4

### Scope

1. 创建 `chat` 技能定义文件
2. 实现 `routeIntent(userInput: string)` 函数：关键词匹配 → 推断技能 ID

### Delta Spec

```
[ADDED] REQ-SKL-CHAT
技能系统必须包含 chat 技能，作为默认对话技能。

[ADDED] REQ-SKL-ROUTE
技能系统必须提供 routeIntent 函数，根据用户输入文本推断目标技能 ID。
匹配规则：
- 包含 "续写"|"写下去"|"继续写" → write
- 包含 "扩写"|"展开"|"详细" → expand
- 包含 "缩写"|"精简"|"压缩" → shrink
- 包含 "描写"|"描述场景" → describe
- 包含 "头脑风暴"|"帮我想" → brainstorm
- 无匹配 → chat（默认）
返回 { skillId: string, confidence: number }
```

### Scenario

**S1: 默认路由到 chat**
```
GIVEN userInput = "你好，这个故事写得怎么样？"
WHEN 调用 routeIntent(userInput)

THEN result.skillId === "chat"
AND result.confidence > 0
```

**S2: 识别"续写"关键词**
```
GIVEN userInput = "帮我续写下去"
WHEN 调用 routeIntent(userInput)

THEN result.skillId === "write"
AND result.confidence >= 0.7
```

**S3: 识别"头脑风暴"关键词**
```
GIVEN userInput = "帮我想想接下来的剧情"
WHEN 调用 routeIntent(userInput)

THEN result.skillId === "brainstorm"
AND result.confidence >= 0.7
```

**S4: 空输入返回 chat**
```
GIVEN userInput = ""
WHEN 调用 routeIntent(userInput)

THEN result.skillId === "chat"
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/skill/__tests__/intentRouter.test.ts`

---

## C4: `p1-aistore-messages`（0.5d）

**模块**: ai-service（renderer store）
**审计来源**: `02-conversation-and-context.md` §3.1

### Scope

在 `aiStore` 中增加 `messages: ChatMessage[]` 和 `addMessage` / `clearMessages` 方法。

### Delta Spec

```
[ADDED] REQ-AIS-MESSAGES
AI 服务的前端 store 必须维护对话消息数组，类型定义：
  type ChatMessage = {
    id: string;          // nanoid
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;   // Date.now()
  }
支持操作：addMessage(msg) / clearMessages()
```

### Scenario

**S1: 添加消息**
```
GIVEN aiStore.messages 为空数组
WHEN 调用 aiStore.addMessage({ role: "user", content: "你好" })

THEN aiStore.messages.length === 1
AND aiStore.messages[0].role === "user"
AND aiStore.messages[0].content === "你好"
AND typeof aiStore.messages[0].id === "string"
AND typeof aiStore.messages[0].timestamp === "number"
```

**S2: 连续添加保持顺序**
```
GIVEN aiStore.messages 为空
WHEN 依次调用 addMessage({role:"user", content:"A"}) 和 addMessage({role:"assistant", content:"B"})

THEN aiStore.messages.length === 2
AND aiStore.messages[0].content === "A"
AND aiStore.messages[1].content === "B"
```

**S3: 清空消息**
```
GIVEN aiStore.messages 有 3 条消息
WHEN 调用 aiStore.clearMessages()

THEN aiStore.messages.length === 0
```

**验证命令**: `pnpm vitest run apps/desktop/renderer/src/stores/__tests__/aiStore.messages.test.ts`

---

## C5: `p1-multiturn-assembly`（1d）

**模块**: ai-service（main process）
**审计来源**: `02-conversation-and-context.md` §3.2
**前置依赖**: C2, C4

### Scope

实现 `assembleLLMMessages` 函数：system prompt + 历史消息 + 当前输入 → LLM API 的 messages 数组。含 token 预算裁剪。

### Delta Spec

```
[ADDED] REQ-AIS-MULTITURN
LLM 调用必须组装多轮消息数组，格式：
  [system, ...history, currentUser]
当总 token 超过预算时，从最早的非 system 消息开始裁剪，保证：
  1. system 消息永远保留
  2. 当前用户消息永远保留
  3. 历史消息从旧到新裁剪
```

### Scenario

**S1: 标准多轮组装**
```
GIVEN systemPrompt = "<identity>AI</identity>"
AND history = [
  { role: "user", content: "介绍林默" },
  { role: "assistant", content: "林默是28岁侦探" },
]
AND currentInput = "他的性格？"

WHEN 调用 assembleLLMMessages({ systemPrompt, history, currentInput })

THEN result.length === 4
AND result[0] === { role: "system", content: "<identity>AI</identity>" }
AND result[1] === { role: "user", content: "介绍林默" }
AND result[2] === { role: "assistant", content: "林默是28岁侦探" }
AND result[3] === { role: "user", content: "他的性格？" }
```

**S2: token 超预算裁剪**
```
GIVEN systemPrompt = "S"  (假设 1 token)
AND history = [
  { role: "user", content: "AAAA" },      // 假设 4 tokens
  { role: "assistant", content: "BBBB" },  // 假设 4 tokens
  { role: "user", content: "CCCC" },       // 假设 4 tokens
  { role: "assistant", content: "DDDD" },  // 假设 4 tokens
]
AND currentInput = "E"  (假设 1 token)
AND tokenBudget = 10

WHEN 调用 assembleLLMMessages({ systemPrompt, history, currentInput, tokenBudget })

THEN result 包含 system (1) + currentInput (1) = 2 tokens 固定
AND 剩余 8 tokens 预算分配给最近的历史消息
AND result 不包含最早被裁掉的消息
AND result 最后一条是 { role: "user", content: "E" }
```

**S3: 空历史**
```
GIVEN history = []
AND currentInput = "你好"

WHEN 调用 assembleLLMMessages({ systemPrompt, history, currentInput })

THEN result.length === 2
AND result[0].role === "system"
AND result[1].role === "user"
AND result[1].content === "你好"
```

**S4: tokenBudget 不足以容纳 system + current**
```
GIVEN systemPrompt 占 100 tokens
AND currentInput 占 50 tokens
AND tokenBudget = 100 (不够)

WHEN 调用 assembleLLMMessages({ systemPrompt, history, currentInput, tokenBudget })

THEN result 仍包含 system + currentInput（强制保留）
AND history 全部被裁掉
AND result.length === 2
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/ai/__tests__/assembleLLMMessages.test.ts`

---

## C6: `p1-apikey-storage`（1d）

**模块**: workbench（main process）
**审计来源**: `06-onboarding-ux-config.md` §3.1

### Scope

1. 实现 API Key 加密存储（Electron safeStorage）
2. 注册 IPC 通道：`ai:store-key`, `ai:get-key`, `ai:test-connection`

### Delta Spec

```
[ADDED] REQ-WB-KEYSAFE
API Key 必须通过 Electron safeStorage API 加密存储。
支持的 provider: "openai" | "anthropic" | "custom"
IPC 通道：
  - ai:store-key({provider, key}) → {success: boolean}
  - ai:get-key({provider}) → {key: string | null}
  - ai:test-connection({provider}) → {success: boolean, error?: string}
```

### Scenario

**S1: 存储并读取 Key**
```
GIVEN provider = "openai", key = "sk-test-abc123"
WHEN 调用 storeApiKey({ provider, key })
AND 然后调用 getApiKey({ provider: "openai" })

THEN storeApiKey 返回 { success: true }
AND getApiKey 返回 { key: "sk-test-abc123" }
```

**S2: 未存储时返回 null**
```
GIVEN 未存储任何 key
WHEN 调用 getApiKey({ provider: "openai" })

THEN 返回 { key: null }
```

**S3: 不同 provider 独立存储**
```
GIVEN 存储了 openai key = "sk-openai"
AND 存储了 anthropic key = "sk-anthropic"
WHEN 分别读取两个 provider

THEN openai 返回 "sk-openai"
AND anthropic 返回 "sk-anthropic"
```

**S4: 空 key 拒绝存储**
```
GIVEN provider = "openai", key = ""
WHEN 调用 storeApiKey({ provider, key })

THEN 返回 { success: false }
AND 错误信息包含 "key" 或 "empty"
```

**验证命令**: `pnpm vitest run apps/desktop/main/src/services/ai/__tests__/apiKeyStorage.test.ts`

注意：测试中必须 mock `electron.safeStorage`，禁止依赖真实 Electron 环境。

---

## C7: `p1-ai-settings-ui`（1d）

**模块**: workbench（renderer）
**审计来源**: `06-onboarding-ux-config.md` §3.1
**前置依赖**: C6

### Scope

设置面板增加 AI 配置区组件 `AiConfigPanel`。

### Delta Spec

```
[ADDED] REQ-WB-AICONFIG
设置面板必须包含 AI 配置区，包含：
  - Provider 选择（OpenAI / Anthropic / Custom）
  - API Key 输入框（password 类型）
  - 模型选择下拉框
  - "测试连接"按钮
  - 连接状态指示（成功/失败/未测试）

[ADDED] REQ-WB-AI-DEGRADATION
无可用 API Key 时，AI 面板发送区显示配置引导文案和跳转链接，而非报错。
```

### Scenario

**S1: 面板渲染所有必要元素**
```
GIVEN 渲染 <AiConfigPanel />

THEN 页面包含 provider 选择元素（role="combobox" 或 select）
AND 页面包含 API Key 输入框（type="password"）
AND 页面包含模型选择元素
AND 页面包含 "测试连接" 按钮
```

**S2: 测试连接调用 IPC**
```
GIVEN 渲染 <AiConfigPanel />
AND 用户已输入 API Key
AND mock IPC "ai:test-connection" 返回 { success: true }
WHEN 用户点击 "测试连接" 按钮

THEN IPC "ai:test-connection" 被调用 1 次
AND 页面显示成功状态（绿色文案或图标）
```

**S3: 测试连接失败显示错误**
```
GIVEN mock IPC "ai:test-connection" 返回 { success: false, error: "Invalid API Key" }
WHEN 用户点击 "测试连接"

THEN 页面显示 "Invalid API Key" 错误文案
```

**S4: 无 Key 时 AI 面板显示引导**
```
GIVEN mock getApiKey 返回 { key: null }
WHEN 渲染 AI 面板的发送区

THEN 显示包含"设置"或"配置"的引导文案
AND 存在可点击的跳转链接/按钮
```

**验证命令**: `pnpm vitest run apps/desktop/renderer/src/features/settings/__tests__/AiConfigPanel.test.tsx`

---

## 约束

- **禁止写任何代码**——你的交付物只有 proposal.md 和 tasks.md
- 每个 Scenario 的 GIVEN/WHEN/THEN 必须包含具体数据值，禁止模糊描述
- 每个 proposal.md 必须包含 Codex 实现指引（目标文件路径、验证命令、Mock 要求）
- 每个 tasks.md 的 §2 TDD Mapping 必须为每个 Scenario 指定测试文件路径和测试用例名
- tasks.md 的 §3-§6 留空，由 Codex 填写
- 完成全部 7 个文档后必须执行二次核对和三次核对
- 核对发现的问题必须修复后才能宣布交付

## 推荐编写顺序

```
C1 (identity-template) → C2 (assemble-prompt) → C4 (aistore-messages) → C5 (multiturn-assembly)
C3 (chat-skill)       — 可与 C1 并行编写
C6 (apikey-storage) → C7 (ai-settings-ui) — 可与主线并行编写
```

按依赖顺序编写，确保后序 change 引用前序 change 定义的类型/接口时保持一致。
