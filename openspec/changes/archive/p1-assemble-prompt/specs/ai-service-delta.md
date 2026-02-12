# AI Service Specification Delta

## Change: p1-assemble-prompt

### Requirement: 系统提示词分层组装 [ADDED]

系统提示词**必须**通过 `assembleSystemPrompt` 函数按固定顺序分层组装，替代原有 `combineSystemText` 的无层级拼接。

组装顺序（约束力从高到低）：

| 序号 | 层名     | 参数名              | 必选 | 说明                                     |
| ---- | -------- | ------------------- | ---- | ---------------------------------------- |
| 1    | identity | `globalIdentity`    | 是   | 全局身份模板（`GLOBAL_IDENTITY_PROMPT`） |
| 2    | rules    | `userRules`         | 否   | 用户/项目级写作规则                      |
| 3    | skill    | `skillSystemPrompt` | 否   | 当前技能的 system prompt                 |
| 4    | mode     | `modeHint`          | 否   | 模式提示（agent/plan/ask）               |
| 5    | memory   | `memoryOverlay`     | 否   | 用户偏好与写作风格记忆                   |
| 6    | context  | `contextOverlay`    | 否   | 动态上下文（KG 规则、项目约束）          |

缺省的层直接跳过，不产生空行或占位符。各层以 `\n\n` 连接。
`globalIdentity` 参数为必选；当其传入空白字符串时，按“空层”处理并跳过，不产生前导分隔符。

函数签名：

```typescript
function assembleSystemPrompt(args: {
  globalIdentity: string;
  userRules?: string;
  skillSystemPrompt?: string;
  modeHint?: string;
  memoryOverlay?: string;
  contextOverlay?: string;
}): string;
```

REQ-ID: `REQ-AIS-PROMPT-ASSEMBLY`

#### Scenario: S1 全层组装顺序正确 [ADDED]

- **假设** `args = { globalIdentity: "<identity>AI</identity>", userRules: "规则：不写暴力内容", skillSystemPrompt: "你是续写助手，从光标处继续写作", modeHint: "Mode: agent", memoryOverlay: "用户偏好：简洁风格", contextOverlay: "当前角色：林默正在调查案件" }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值中 `"<identity>"` 出现位置 < `"规则"` 出现位置
- **并且** `"规则"` 出现位置 < `"续写助手"` 出现位置
- **并且** `"续写助手"` 出现位置 < `"Mode: agent"` 出现位置
- **并且** `"Mode: agent"` 出现位置 < `"简洁风格"` 出现位置
- **并且** `"简洁风格"` 出现位置 < `"林默"` 出现位置

#### Scenario: S2 缺省层跳过 [ADDED]

- **假设** `args = { globalIdentity: "<identity>AI</identity>", userRules: undefined, skillSystemPrompt: undefined, modeHint: undefined, memoryOverlay: undefined, contextOverlay: undefined }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值 === `"<identity>AI</identity>"`
- **并且** 返回值不包含连续两个 `\n\n\n\n`（无空层残留）

#### Scenario: S3 空白字符串层被跳过 [ADDED]

- **假设** `args = { globalIdentity: "<identity>AI</identity>", userRules: "  ", skillSystemPrompt: "", memoryOverlay: "\n" }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值 === `"<identity>AI</identity>"`
- **并且** 空白/换行的层不出现在输出中

#### Scenario: S4 identity 为空白时不产生占位分隔符 [ADDED]

- **假设** `args = { globalIdentity: "   ", modeHint: "Mode: agent" }`
- **当** 调用 `assembleSystemPrompt(args)`
- **则** 返回值 === `"Mode: agent"`
- **并且** 返回值不以 `\n\n` 开头
