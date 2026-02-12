# Skill System Specification Delta

## Change: p1-chat-skill

### Requirement: chat 默认对话技能 [ADDED]

技能系统**必须**包含 `builtin:chat` 技能，作为默认对话技能。当意图路由无法匹配到具体技能时，统一路由到 `builtin:chat`。

REQ-ID: `REQ-SKL-CHAT`

### Requirement: 意图路由函数 [ADDED]

技能系统**必须**提供 `inferSkillFromInput` 函数，根据用户输入文本和上下文推断目标技能 ID。

函数签名：
```typescript
function inferSkillFromInput(args: {
  input: string;
  hasSelection: boolean;
  explicitSkillId?: string;
}): string
```

路由优先级：
1. 显式技能覆盖（`explicitSkillId` 非空时直接返回）
2. 选中文本上下文启发式（有选中 + 无输入 → `builtin:polish`；有选中 + 短改写指令 → `builtin:rewrite`）
3. 关键词匹配规则：

| 关键词 | 目标技能 ID |
|--------|------------|
| "续写"/"写下去"/"接着写"/"继续写" | `builtin:continue` |
| "头脑风暴"/"帮我想想" | `builtin:brainstorm` |
| "大纲"/"提纲" | `builtin:outline` |
| "总结"/"摘要" | `builtin:summarize` |
| "翻译" | `builtin:translate` |
| "扩写"/"展开" | `builtin:expand` |
| "缩写"/"精简" | `builtin:condense` |

4. 默认 → `builtin:chat`

REQ-ID: `REQ-SKL-ROUTE`

#### Scenario: S1 默认路由到 chat [ADDED]

- **假设** `args = { input: "你好，这个故事写得怎么样？", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:chat"`

#### Scenario: S2 识别"续写"关键词 [ADDED]

- **假设** `args = { input: "帮我接着写下去", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:continue"`

#### Scenario: S3 识别"头脑风暴"关键词 [ADDED]

- **假设** `args = { input: "帮我想想接下来的剧情", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:brainstorm"`

#### Scenario: S4 空输入返回 chat [ADDED]

- **假设** `args = { input: "", hasSelection: false }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:chat"`

#### Scenario: S5 显式技能覆盖优先 [ADDED]

- **假设** `args = { input: "帮我续写", hasSelection: false, explicitSkillId: "builtin:polish" }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:polish"`（显式覆盖优先于关键词匹配）

#### Scenario: S6 有选中文本且无输入路由到 polish [ADDED]

- **假设** `args = { input: "", hasSelection: true }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:polish"`

#### Scenario: S7 有选中文本且短改写指令路由到 rewrite [ADDED]

- **假设** `args = { input: "改写", hasSelection: true }`
- **当** 调用 `inferSkillFromInput(args)`
- **则** 返回值 === `"builtin:rewrite"`
