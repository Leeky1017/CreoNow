# Context Engine Specification

## P1 变更摘要

本次为 P1（系统脊柱）阶段新增以下变更：

| 变更 | 描述 |
|------|------|
| P1 — 中文 Token 估算 | CJK ≈ 1.5 tokens/char，非 CJK ≈ 0.25 tokens/byte |
| P1 — 容量警戒策略 | 87% 警告 + 95% 强制裁剪 |
| P1 — V1 简化层级 | 只启用 Rules + Immediate 两层，Retrieved/Settings 为空 |

## Purpose

分层上下文管理（Rules / Settings / Retrieved / Immediate），Token 预算分配与裁剪，Stable prefix hash 支持 prompt caching。

### Scope

| Layer   | Path                                                     |
| ------- | -------------------------------------------------------- |
| Backend | `main/src/services/context/`                             |
| IPC     | `main/src/ipc/context.ts`, `main/src/ipc/constraints.ts` |

## Requirements

### Requirement: P1 — 中文 Token 估算修正

CC（Cursor/Copilot 等英文优先的编辑器）使用 `UTF8_BYTES_PER_TOKEN ≈ 4` 估算 token 数，该假设面向英文文本。CreoNow 作为中文创作 IDE，**必须**提供 CJK 感知的 token 估算函数，以确保上下文预算在中文场景下准确。

估算规则：

| 字符类型 | 估算系数 | 依据 |
|----------|----------|------|
| CJK 字符（汉字、假名、韩文、全角符号等） | 1.5 tokens/char | 主流 BPE tokenizer 对中日韩字符的平均编码长度 |
| 非 CJK 字节（ASCII、Latin 等） | 0.25 tokens/byte（即 4 bytes/token） | 与英文估算一致 |

函数签名：

```typescript
/**
 * CJK 感知的 token 估算。
 * CJK 字符按 1.5 tokens/char，非 CJK 按 0.25 tokens/byte。
 */
function estimateTokens(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/gu) || []).length;
  // V1 仅覆盖常用 CJK 字符（BMP + Extension B），罕用字（Extension C-H）可能低估 ~5%
  const nonCjkBytes = bytes - cjkChars * 3; // CJK char = 3 bytes in UTF-8
  return Math.ceil(cjkChars * 1.5 + nonCjkBytes / 4);
}
```

此函数用于上下文预算计算、容量阈值检测、裁剪决策等所有涉及 token 计数的环节。当精确 tokenizer（如 tiktoken）可用时，优先使用精确结果；`estimateTokens` 作为快速估算的 fallback。

#### Scenario: 纯中文文本的 token 估算

- **假设** 输入文本为 1000 个汉字的纯中文段落
- **当** 调用 `estimateTokens(text)`
- **则** 返回值为 `Math.ceil(1000 * 1.5)` = 1500
- **并且** 该值用于上下文预算扣减

#### Scenario: 中英混合文本的 token 估算

- **假设** 输入文本包含 500 个汉字和 200 bytes 的英文（含空格标点）
- **当** 调用 `estimateTokens(text)`
- **则** CJK 部分贡献 `500 * 1.5` = 750 tokens
- **并且** 非 CJK 部分贡献 `200 / 4` = 50 tokens
- **并且** 总估算为 800 tokens

#### Scenario: 纯英文文本保持兼容

- **假设** 输入文本为 400 bytes 的纯英文
- **当** 调用 `estimateTokens(text)`
- **则** 返回值为 `400 / 4` = 100
- **并且** 与 CC 的 `UTF8_BYTES_PER_TOKEN=4` 估算一致

---

### Requirement: P1 — 上下文容量警戒策略

系统**必须**实现两级容量警戒策略，在上下文预算接近极限时提前干预，避免 prompt 被模型截断。

容量阈值定义：

| 阈值 | 百分比 | 行为 |
|------|--------|------|
| 警告阈值 | 87% | `warnings` 中添加 `CONTEXT_CAPACITY_WARNING`，通知上层可能需要缩减输入 |
| 强制裁剪阈值 | 95% | 立即执行强制裁剪，按优先级从低到高裁剪直到总量 ≤ 95% 预算 |

容量策略接口：

```typescript
interface CapacityPolicy {
  warnThreshold: 0.87;   // 87% 时触发警告
  forceThreshold: 0.95;  // 95% 时强制裁剪
  maxBudget: number;     // 模型上下文窗口 - system prompt - 输出预留
}
```

容量百分比计算：`capacityPercent = (totalTokens / maxBudget) * 100`。

强制裁剪流程：

1. 计算组装后总 token 数
2. 若 `capacityPercent` ≥ 95%，触发强制裁剪
3. 裁剪顺序按优先级从低到高：Retrieved → Settings → Immediate（尾部裁剪）
4. Rules 层**不可裁剪**
5. 裁剪后重新计算 `capacityPercent`，确保 ≤ 95%
6. 若 87% ≤ `capacityPercent` < 95%，不裁剪但在 `warnings` 中记录 `CONTEXT_CAPACITY_WARNING`

#### Scenario: 容量达到 87% 触发警告

- **假设** `maxBudget` = 6000 tokens
- **当** 组装后总 token 为 5250（87.5%）
- **则** `warnings` 包含 `CONTEXT_CAPACITY_WARNING`
- **并且** 不执行裁剪，所有层内容完整

#### Scenario: 容量超过 95% 强制裁剪

- **假设** `maxBudget` = 6000 tokens
- **当** 组装后总 token 为 5850（97.5%）
- **则** 系统按优先级从低到高执行强制裁剪
- **并且** 裁剪后 `capacityPercent` ≤ 95%
- **并且** `warnings` 包含 `CONTEXT_CAPACITY_FORCE_TRIM`

#### Scenario: 容量在安全范围内无动作

- **假设** `maxBudget` = 6000 tokens
- **当** 组装后总 token 为 4800（80%）
- **则** 不触发任何警告或裁剪
- **并且** `warnings` 为空（无容量相关项）

---

### Requirement: P1 — V1 简化版上下文层级与组装

V1 阶段（最小可闭环系统）对四层上下文架构做以下简化：**只启用 Rules 层和 Immediate 层**，Retrieved 层和 Settings 层在 V1 为空，不参与组装和排序。

> 四层架构的完整定义不变（见后续「四层上下文架构」Requirement），V1 简化仅约束当前阶段的实现范围。

V1 层级状态：

| 层级 | V1 状态 | 说明 |
|------|---------|------|
| Rules | ✅ 启用 | 注入基础创作规则和用户约束，不可裁剪 |
| Settings | ⬜ 空 | 语义记忆等功能在 V1 未实现，该层始终为空 |
| Retrieved | ⬜ 空 | 检索增强在 V1 未实现，该层始终为空 |
| Immediate | ✅ 启用 | 当前文档上下文，支持尾部裁剪 |

V1 简化版裁剪优先级：

1. Rules 层：**不裁剪**
2. Immediate 层：**尾部裁剪**（保留光标前最近内容）
3. Retrieved / Settings 层为空，不参与排序

V1 简化版组装 API：

```typescript
interface P1ContextAssembleRequest {
  projectId: string;
  documentId: string;
  cursorPosition: number;
  skillId: string;
  selectedText?: string;
}

interface P1ContextAssembleResult {
  prompt: string;
  tokenCount: number;
  stablePrefixHash: string;
  stablePrefixUnchanged: boolean;
  layers: {
    rules: { tokens: number; content: string };
    immediate: { tokens: number; truncated: boolean };
  };
  warnings: string[];
  capacityPercent: number; // 0-100，用于 87%/95% 阈值检测
}
```

V1 组装流程：

1. 加载 Rules 层内容（基础创作规则 + 用户约束）
2. 加载 Immediate 层内容（当前文档光标前后文）
3. 使用 `estimateTokens()` 计算各层 token 数
4. 计算 `capacityPercent`，按容量警戒策略处理
5. 若需裁剪，仅裁剪 Immediate 层尾部
6. 计算 `stablePrefixHash`（V1 中 Stable Prefix = Rules 层内容）
7. 返回 `P1ContextAssembleResult`

#### Scenario: V1 两层正常组装

- **假设** 用户在编辑器中触发续写，项目有基础创作规则
- **当** V1 Context Engine 组装上下文
- **则** Rules 层注入基础创作规则
- **并且** Immediate 层注入当前文档光标前内容
- **并且** Settings 层和 Retrieved 层为空，不出现在 `layers` 中
- **并且** `capacityPercent` 正确反映两层总 token 占比

#### Scenario: V1 Immediate 层尾部裁剪

- **假设** 当前文档有 20000 字，Rules 层占 300 tokens，`maxBudget` = 4000 tokens
- **当** Immediate 层原始 token 数超出剩余预算
- **则** Immediate 层执行尾部裁剪，保留光标前最近的内容
- **并且** 裁剪后 `capacityPercent` ≤ 95%
- **并且** `layers.immediate.truncated` = `true`

#### Scenario: V1 新项目——Rules 为空，仅有 Immediate

- **假设** 用户刚创建项目，未设定任何创作规则
- **当** V1 Context Engine 组装上下文
- **则** Rules 层为空（仅有基础 system prompt）
- **并且** Immediate 层包含当前编辑内容
- **并且** AI 以通用模式生成，功能正常

---

### Requirement: 四层上下文架构

系统**必须**实现四层上下文架构，每层有独立的数据来源、优先级和 token 预算。

```
┌───────────────────────────────────────────────────┐
│                   AI Prompt                        │
│                                                    │
│  ┌─────────────┐  最高优先级，不可裁剪              │
│  │ Rules 层     │  创作规则、知识图谱设定            │
│  └─────────────┘                                   │
│  ┌─────────────┐  高优先级，用户偏好                │
│  │ Settings 层  │  语义记忆规则、叙述人称、风格设定   │
│  └─────────────┘                                   │
│  ┌─────────────┐  中优先级，可裁剪                  │
│  │ Retrieved 层 │  检索增强片段（P4+ 规划）、情景记忆参考  │
│  └─────────────┘                                   │
│  ┌─────────────┐  最低优先级（但必须包含）           │
│  │ Immediate 层 │  当前章节上下文、工作记忆          │
│  └─────────────┘                                   │
└───────────────────────────────────────────────────┘
```

各层定义：

| 层级      | 数据来源                               | 优先级 | 可裁剪   | 典型内容                         |
| --------- | -------------------------------------- | ------ | -------- | -------------------------------- |
| Rules     | 项目设定、知识图谱、用户显式创作规则   | 最高   | 否       | 叙述人称、角色设定、世界观约束   |
| Settings  | 语义记忆（自动学习的偏好）、项目配置   | 高     | 部分     | 写作风格偏好、场景偏好、词汇偏好 |
| Retrieved | 检索增强片段（P4+ 规划）、情景记忆案例   | 中     | 是       | 前文相关段落、历史交互参考       |
| Immediate | 当前章节内容、光标位置前后文、工作记忆 | 必须   | 尾部裁剪 | 当前编辑的即时上下文             |

组装顺序：Rules → Settings → Retrieved → Immediate。当总 token 超出预算时，按优先级**从低到高**裁剪。

#### Scenario: 四层上下文正常组装

- **假设** 用户在第十章触发续写，项目有完整的知识图谱和语义记忆
- **当** Context Engine 组装 AI 上下文
- **则** Rules 层注入：叙述人称「第一人称」、角色「林远」设定
- **并且** Settings 层注入：语义记忆规则「动作场景偏好短句」
- **并且** Retrieved 层注入：检索增强的前文相关段落（P4+ 规划）
- **并且** Immediate 层注入：当前章节光标前 2000 tokens 内容
- **并且** 四层按顺序拼接为完整 prompt

#### Scenario: 新项目——Rules 和 Settings 为空

- **假设** 用户刚创建项目，未设定任何创作规则，也没有语义记忆
- **当** Context Engine 组装 AI 上下文
- **则** Rules 层为空（仅有基础 system prompt）
- **并且** Settings 层为空
- **并且** Retrieved 层为空（无历史内容可召回）
- **并且** Immediate 层包含当前编辑的内容
- **并且** AI 以通用模式生成，功能正常

---

### Requirement: Token 预算管理

系统**必须**实现严格的 Token 预算管理，确保组装后的 prompt 不超过模型的上下文窗口限制。

预算分配策略：

| 层级      | 默认预算比例 | 最小保障    | 裁剪策略                       |
| --------- | ------------ | ----------- | ------------------------------ |
| Rules     | 15%          | 500 tokens  | 不裁剪（超出时报警）           |
| Settings  | 10%          | 200 tokens  | 按 confidence 降序保留         |
| Retrieved | 25%          | 0 tokens    | 按相似度得分降序截断           |
| Immediate | 50%          | 2000 tokens | 尾部裁剪（保留光标前最近内容） |

总预算 = 模型上下文窗口 - system prompt tokens - 输出预留 tokens。

预算计算流程：

1. 计算各层实际 token 数
2. 若总量 ≤ 预算，不裁剪
3. 若总量 > 预算，按优先级从低到高依次裁剪：Retrieved → Settings → Immediate（尾部）
4. Rules 层**不可裁剪**——若 Rules 单独超出总预算 15%，记录警告日志

Token 计算**必须**使用与目标 LLM 一致的 tokenizer（如 tiktoken）。

预算管理的 IPC 通道：

| IPC 通道                | 通信模式         | 方向            | 用途             |
| ----------------------- | ---------------- | --------------- | ---------------- |
| `context:budget:get`    | Request-Response | Renderer → Main | 获取当前预算分配 |
| `context:budget:update` | Request-Response | Renderer → Main | 更新预算配置     |

#### Scenario: Token 预算内——不裁剪

- **假设** 模型上下文窗口 8K tokens，总预算 6K tokens
- **当** 四层内容总计 5500 tokens
- **则** 所有内容完整注入，不执行裁剪

#### Scenario: Token 超出预算——裁剪 Retrieved 层

- **假设** 总预算 6K tokens，当前四层总计 7500 tokens（Retrieved 占 2500）
- **当** Context Engine 执行裁剪
- **则** 先裁剪 Retrieved 层：按相似度得分降序，移除低分 chunk 直到总量 ≤ 6K
- **并且** Rules、Settings、Immediate 层保持完整

#### Scenario: 极端场景——Rules 层单独超出预算

- **假设** 项目知识图谱包含 100 个角色实体，Rules 层 token 数达到 2000（超出 15% 预算线）
- **当** Context Engine 检测到 Rules 层超标
- **则** 记录警告日志 `CONTEXT_RULES_OVERBUDGET`
- **并且** Rules 层仅注入与当前编辑内容最相关的实体（按语义相关度筛选）
- **并且** 其他层正常裁剪

---

### Requirement: Stable Prefix Hash（prompt caching 支持）

系统**必须**通过 Stable Prefix Hash 机制支持 LLM 的 prompt caching，减少重复计算成本。

Stable Prefix 定义：prompt 中**不随每次请求变化**的前缀部分，通常包括 Rules 层和 Settings 层。

实现策略：

1. 每次组装 prompt 时，计算 Rules + Settings 层内容的 SHA-256 hash
2. 若 hash 与上次请求相同，标记 `stablePrefixUnchanged: true`
3. AI Service 层根据此标记决定是否启用 prompt caching（如 Anthropic 的 cache_control）

hash 计算**必须**确定性——相同输入**必须**产生相同 hash，不受时间戳等变量影响。

#### Scenario: 连续续写——Stable Prefix 命中缓存

- **假设** 用户连续触发 3 次续写，期间 Rules 和 Settings 层未变化
- **当** 第 2 次和第 3 次请求组装 prompt
- **则** Stable Prefix hash 与前次相同
- **并且** AI Service 标记 `stablePrefixUnchanged: true`，启用 prompt caching
- **并且** 仅 Retrieved + Immediate 层的变化部分需要重新计算

#### Scenario: Settings 变更导致缓存失效

- **假设** 用户在记忆面板中确认了一条新的语义记忆规则
- **当** 下次续写请求组装 prompt
- **则** Settings 层内容变化，Stable Prefix hash 改变
- **并且** prompt caching 失效，全量重新计算

---

### Requirement: projectScopedCache 必须实现 singleflight 去重

`projectScopedCache.ts` 的 `getOrComputeString()` 在 cache miss 时调用 `compute()`。并发请求同一 key **必须**通过 Promise-based singleflight 模式去重，确保同一 key 仅触发一次计算。

#### Scenario: AUD-C1-S6 同 key 并发请求仅触发一次计算

- **假设** 缓存中不存在 key K1，`compute(K1)` 耗时 100ms
- **当** 3 个并发的 `getOrComputeString(K1)` 同时到达
- **则** `compute(K1)` 仅被调用 1 次
- **并且** 3 个调用者均获得相同的计算结果

#### Scenario: AUD-C1-S7 不同 key 的并发请求互不阻塞

- **假设** 缓存中不存在 key K1 和 K2
- **当** `getOrComputeString(K1)` 和 `getOrComputeString(K2)` 并发执行
- **则** `compute(K1)` 和 `compute(K2)` 各自独立执行，互不阻塞
- **并且** 两个结果分别正确缓存

#### Scenario: AUD-C1-S8 singleflight 中 compute 失败不缓存错误

- **假设** 缓存中不存在 key K1，`compute(K1)` 将抛出异常
- **当** 2 个并发的 `getOrComputeString(K1)` 同时到达
- **则** 两个调用者均收到异常
- **并且** 失败结果不被缓存，后续请求可重新触发计算

---

### Requirement: Constraints（创作约束）

系统**必须**支持用户定义显式创作约束（Constraints），约束注入 Rules 层，具有最高优先级。

约束类型：

| 约束类型   | 示例                                         | 来源                |
| ---------- | -------------------------------------------- | ------------------- |
| 叙述约束   | 「严格第一人称叙述，不出现主角不在场的场景」 | 项目设定            |
| 角色约束   | 「林远性格冷静，不会大声喊叫」               | 知识图谱            |
| 世界观约束 | 「本世界没有魔法，所有能力基于科技」         | 用户显式设定        |
| 风格约束   | 「避免使用感叹号和省略号」                   | 语义记忆 / 用户手动 |
| 情节约束   | 「主角在第五章之前不知道真相」               | 用户显式设定        |

约束管理通过以下 IPC 通道完成：

| IPC 通道             | 通信模式         | 方向            | 用途         |
| -------------------- | ---------------- | --------------- | ------------ |
| `constraints:list`   | Request-Response | Renderer → Main | 列出当前约束 |
| `constraints:create` | Request-Response | Renderer → Main | 创建约束     |
| `constraints:update` | Request-Response | Renderer → Main | 更新约束     |
| `constraints:delete` | Request-Response | Renderer → Main | 删除约束     |

约束在 Rules 层中的注入格式：

```
[创作约束 - 不可违反]
1. 严格第一人称叙述
2. 林远性格冷静，不会大声喊叫
3. 本世界没有魔法
```

#### Scenario: 用户添加创作约束

- **假设** 用户打开项目设置的「创作约束」区域
- **当** 用户添加约束「主角在第五章之前不知道真相」
- **则** 系统通过 `constraints:create` 持久化
- **并且** 后续所有 AI 生成的 prompt 中 Rules 层包含此约束

#### Scenario: AI 生成违反约束时的处理

- **假设** Rules 层包含约束「严格第一人称叙述」
- **当** AI 生成内容中出现第三人称叙述
- **则** Judge 模块（AI Service）检测到约束违反
- **并且** 系统自动重新生成或在 AI 面板中标注违规提示

#### Scenario: 约束过多导致 Rules 层膨胀

- **假设** 用户添加了 30 条约束，加上知识图谱设定，Rules 层达到 3000 tokens
- **当** Context Engine 组装 prompt
- **则** 系统记录警告 `CONTEXT_RULES_OVERBUDGET`
- **并且** 按约束优先级（用户显式 > 知识图谱自动）裁剪低优先级约束
- **并且** 被裁剪的约束记录到日志

---

### Requirement: 上下文组装 API

Context Engine**必须**提供统一的上下文组装 API，供 AI Service 调用。

API 签名：

```typescript
interface ContextAssembleRequest {
  projectId: string;
  documentId: string;
  cursorPosition: number;
  skillId: string;
  additionalInput?: string; // 用户的额外指令
}

interface ContextAssembleResult {
  prompt: string; // 组装后的完整 prompt
  tokenCount: number; // 实际 token 数
  stablePrefixHash: string; // Stable Prefix hash
  stablePrefixUnchanged: boolean;
  layers: {
    rules: { tokens: number; truncated: boolean };
    settings: { tokens: number; truncated: boolean };
    retrieved: { tokens: number; truncated: boolean; chunks: number };
    immediate: { tokens: number; truncated: boolean };
  };
  warnings: string[]; // 裁剪警告等
}
```

组装过程的 IPC 通道：

| IPC 通道           | 通信模式         | 方向            | 用途           |
| ------------------ | ---------------- | --------------- | -------------- |
| `context:assemble` | Request-Response | Renderer → Main | 组装上下文     |
| `context:inspect`  | Request-Response | Renderer → Main | 检查上下文详情 |

`context:inspect` 用于调试——返回各层的详细内容和 token 分布，不注入 prompt。

#### Scenario: AI 技能调用时组装上下文

- **假设** 用户在第七章触发续写技能
- **当** AI Service 调用 `context:assemble`
- **则** Context Engine 按层级组装 prompt
- **并且** 返回 `ContextAssembleResult`，包含各层 token 分布
- **并且** AI Service 使用组装后的 prompt 调用 LLM

#### Scenario: 上下文组装中某层数据源不可用

- **假设** 知识图谱服务暂时不可用
- **当** Context Engine 尝试组装 Rules 层中的 KG 数据
- **则** KG 部分跳过，Rules 层仅包含用户显式约束
- **并且** `warnings` 数组中记录 `"KG_UNAVAILABLE: 知识图谱数据未注入"`
- **并且** 组装继续，不中断

---

### Requirement: 项目解绑必须清理 Context Engine 的 project-scoped cache/watcher

Context Engine 中与项目绑定的资源（project-scoped cache、watcher/订阅等）**必须**在项目切换的 unbind 阶段完成释放，避免跨项目污染、句柄泄漏或残留事件流。

- unbind 完成后，不得继续接收或处理来自旧项目的事件。
- 清理行为必须可被自动化测试验证。

#### Scenario: BE-SLA-S4 项目解绑时清理 project-scoped cache/watcher

- **假设** 项目 A 运行期间创建了 project-scoped 缓存与文件 watcher/订阅
- **当** 项目 A 被切换离开并执行 unbind
- **则** 缓存与 watcher/订阅 被释放/清空
- **并且** 不再继续接收来自项目 A 的事件或占用文件句柄

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

- 量化阈值：
  - `context:assemble` p95 < 250ms
  - token 预算计算 p95 < 80ms
  - `context:inspect` p95 < 180ms
- 边界与类型安全：
  - `TypeScript strict` + zod
  - 上下文层数据必须携带 `source` 和 `tokenCount`
- 失败处理策略：
  - 某层不可用时降级继续组装并返回 `warnings`
  - 预算计算失败时回退默认预算并返回 `CONTEXT_BUDGET_FALLBACK`
  - 所有异常必须显式错误码
- Owner 决策边界：
  - 四层优先级、不可裁剪策略、预算默认比例由 Owner 固定
  - Agent 不可更改层优先级顺序

#### Scenario: 组装性能与预算一致性达标

- **假设** 同时执行 500 次 `context:assemble`
- **当** 包含 Rules/Settings/Retrieved/Immediate 四层
- **则** p95 小于 250ms
- **并且** 结果 tokenCount 不超过目标预算

#### Scenario: 预算计算器异常自动回退

- **假设** tokenizer 组件返回异常
- **当** 组装上下文
- **则** 系统回退到默认 budget profile
- **并且** `warnings` 包含 `CONTEXT_BUDGET_FALLBACK`

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                             |
| ------------ | ---------------------------------------- |
| 网络/IO 失败 | 检索层读取失败、记忆层读取失败           |
| 数据异常     | 层数据格式非法、token 统计为负值         |
| 并发冲突     | 并发组装同文档不同光标、并发更新预算配置 |
| 容量溢出     | 单层 token 爆炸、总预算溢出              |
| 权限/安全    | 跨项目上下文注入、未授权 inspect         |

#### Scenario: 并发更新预算配置的版本校验

- **假设** 两个请求同时更新预算比例
- **当** 后到请求提交旧版本号
- **则** 返回 `CONTEXT_BUDGET_CONFLICT`
- **并且** 不覆盖先到请求配置

#### Scenario: 跨项目上下文注入被阻断

- **假设** 请求携带 `projectId=A` 但 Retrieved 数据来自 `projectId=B`
- **当** 组装执行
- **则** 系统拒绝注入并返回 `CONTEXT_SCOPE_VIOLATION`
- **并且** 记录安全日志

---

### Non-Functional Requirements

**Performance**

- `context:assemble`：p50 < 120ms，p95 < 250ms，p99 < 500ms
- 预算计算：p50 < 30ms，p95 < 80ms，p99 < 150ms
- hash 计算：p95 < 20ms

**Capacity**

- 单次组装最大 token 输入：64k
- Retrieved chunk 上限：200
- Rules 约束条目上限：500

**Security & Privacy**

- 上下文日志默认只记录摘要与 hash，不记录全文
- `context:inspect` 仅限调试模式与授权用户
- 所有层输入必须按 `projectId` 隔离

**Concurrency**

- 同文档并发组装最大 4
- 预算配置更新需乐观锁版本号
- 超限请求返回 `CONTEXT_BACKPRESSURE`

#### Scenario: 超大上下文输入保护

- **假设** 输入 token 预估为 90k
- **当** 触发组装
- **则** 系统返回 `CONTEXT_INPUT_TOO_LARGE`
- **并且** 提示用户缩小检索范围

---

## P2: Narrative-Aware Context Compression

> **阶段**: P2（端到端闭环）
> **依赖**: P1 — 中文 Token 估算、P1 — 上下文容量警戒策略、P1 — V1 简化版上下文层级与组装
> **CC 参考**: `services/autoCompact.ts`（自动压缩触发）+ `services/microcompact.ts`（微压缩）+ `services/compactMessageHistory.ts`（对话历史压缩）

### P2 变更摘要

| 变更 | 描述 |
|------|------|
| P2 — CompressionEngine | 三层压缩策略：对话历史压缩 + 微压缩 + 叙事感知摘要 |
| P2 — 叙事保留规则 | 压缩过程中必须保留角色名、情节要点、语气/风格标记 |
| P2 — 熔断器 | 连续 3 次压缩失败后停止压缩并通知用户 |
| P2 — 上下文层扩展 | 压缩后的历史作为 `compressed-history` 层参与组装 |

### P1 → P2 演进说明

P1 的容量策略仅在组装时做**尾部裁剪**——当 token 超出预算时，从 Immediate 层尾部截断。这在短对话中可接受，但长篇创作场景下会丢失大量上文信息。

P2 引入**运行时压缩**：在上下文窗口接近 87% 容量时，主动对对话历史和文档上下文进行叙事感知压缩，保留关键创作信息的同时显著缩减 token 消耗。

**关键差异**：
- CC 的 autoCompact 面向通用代码对话，使用 NO_TOOLS_PREAMBLE 的通用摘要
- CN 的压缩**必须叙事感知**：角色名、情节转折、叙述视角、伏笔线索不得在压缩中丢失

---

### Requirement: P2 — CompressionEngine 核心接口

The system SHALL provide a `CompressionEngine` that implements three-layer compression strategy with narrative awareness, triggered when context window approaches capacity.

**核心数据类型**:

```typescript
/** 压缩策略层级 */
type CompressionLayer =
  | 'history-compaction'        // 第一层：对话历史压缩
  | 'micro-compression'         // 第二层：单条消息微压缩
  | 'narrative-summarization';  // 第三层：叙事感知摘要

/** 叙事保留要素 */
interface NarrativeElements {
  /** 出现的角色名列表 */
  characterNames: string[];
  /** 关键情节要点 */
  plotPoints: string[];
  /** 语气/风格标记（如"冷硬"、"抒情"） */
  toneMarkers: string[];
  /** 叙述视角（如"第一人称"、"全知视角"） */
  narrativePOV?: string;
  /** 伏笔/悬念线索 */
  foreshadowingClues: string[];
  /** 时间线标记 */
  timelineMarkers: string[];
}

/** 压缩请求 */
interface CompressionRequest {
  /** 待压缩的消息历史（使用 ai-service 的 LLMMessage 类型） */
  messages: LLMMessage[];
  /** 目标 token 数（压缩后不超过此值） */
  targetTokens: number;
  /** 当前文档的叙事元素（用于指导压缩保留） */
  narrativeContext: NarrativeElements;
  /** 当前项目 ID */
  projectId: string;
  /** 当前文档 ID */
  documentId: string;
}

/** 压缩结果 */
interface CompressionResult {
  /** 压缩后的消息数组（使用 ai-service 的 LLMMessage 类型） */
  compressedMessages: LLMMessage[];
  /** 压缩后的 token 数 */
  compressedTokens: number;
  /** 压缩前的 token 数 */
  originalTokens: number;
  /** 压缩比（compressedTokens / originalTokens） */
  compressionRatio: number;
  /** 使用的压缩层级 */
  layersApplied: CompressionLayer[];
  /** 保留的叙事元素 */
  preservedElements: NarrativeElements;
  /** 警告（如某些叙事元素可能丢失） */
  warnings: string[];
}

/** 压缩统计 */
interface CompressionStats {
  /** 总压缩次数 */
  totalCompressions: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 连续失败次数（熔断器用） */
  consecutiveFailures: number;
  /** 熔断器是否已触发 */
  circuitBreakerOpen: boolean;
  /** 累计节省的 token 数 */
  totalTokensSaved: number;
}
```

**CompressionEngine 接口**:

```typescript
/** 压缩引擎错误码 */
type CompressionErrorCode =
  | 'COMPRESSION_FAILED'              // 压缩执行失败
  | 'COMPRESSION_CIRCUIT_OPEN'        // 熔断器已打开，拒绝压缩
  | 'COMPRESSION_TARGET_UNREACHABLE'  // 目标 token 数无法达到（内容已最小化）
  | 'COMPRESSION_NARRATIVE_LOSS'      // 压缩导致关键叙事元素丢失
  | 'COMPRESSION_LLM_ERROR'           // 压缩所用的 LLM 调用失败
  | 'CONTEXT_BACKPRESSURE';           // 并发组装超过上限（最大 4），请求排队或拒绝

/** 叙事感知上下文压缩引擎 */
interface CompressionEngine {
  /**
   * 执行压缩。
   * 按三层策略依次尝试，直到达到目标 token 数或所有层级用尽。
   *
   * 压缩优先级（从低成本到高成本）：
   * 1. history-compaction: 合并相邻的 user+assistant 对话对为摘要
   * 2. micro-compression: 对单条长消息做段内缩减（去冗余、精简表达）
   * 3. narrative-summarization: 使用 LLM 生成叙事感知摘要（最高质量但最慢）
   *
   * > **实现阶段说明**：当前版本仅实现第三层（叙事压缩）。前两层（历史精简、微压缩）列入 P4-04 AutoCompact v2 路线图。
   *
   * @param request 压缩请求
   * @returns 压缩结果
   * @throws CompressionError(COMPRESSION_CIRCUIT_OPEN) 熔断器打开时
   * @throws CompressionError(COMPRESSION_FAILED) 压缩超时（超过 timeoutMs）时
   */
  compress(request: CompressionRequest): Promise<CompressionResult>;

  /**
   * 检查是否需要压缩。
   * 基于当前 token 用量和 87% 容量阈值判断。
   * **最小绝对阈值**：`currentTokens >= 500`（可通过 CompressionConfig.minTokenThreshold 配置）。
   * 即使比例超过 87%，若绝对 token 数低于阈值，也不触发压缩（避免小预算场景下的无意义压缩）。
   *
   * 触发条件：`currentTokens >= minTokenThreshold AND currentTokens / maxBudget >= 0.87`
   *
   * @param currentTokens 当前 token 总量
   * @param maxBudget 最大 token 预算
   * @returns true 表示应触发压缩
   */
  shouldCompress(currentTokens: number, maxBudget: number): boolean;

  /**
   * 获取压缩统计信息。
   */
  getCompressionStats(): CompressionStats;

  /**
   * 重置熔断器（用户手动干预后调用）。
   */
  resetCircuitBreaker(): void;

  /**
   * 销毁引擎，释放资源。
   */
  dispose(): void;
}
```

#### Scenario: 上下文达到 87% 触发压缩

- **假设** `maxBudget` = 8000 tokens，当前消息历史占 7100 tokens（88.75%）
- **当** 调用 `compressionEngine.shouldCompress(7100, 8000)`
- **则** 返回 `true`
- **当** 调用 `compressionEngine.compress(request)` 后
- **则** 返回 `CompressionResult`，`compressedTokens` ≤ `targetTokens`
- **并且** `layersApplied` 列出实际使用的压缩层级
- **并且** `preservedElements` 包含所有提取到的角色名、情节要点

#### Scenario: 压缩保留角色名和情节要点

- **假设** 对话历史中多次提及角色 "林远"、"苏婉"，以及情节要点 "发现密室中的日记"
- **当** 执行 `narrative-summarization` 层压缩
- **则** 压缩后的摘要中保留 "林远"、"苏婉" 的名字
- **并且** 保留 "发现密室中的日记" 的情节信息
- **并且** `preservedElements.characterNames` 包含 `['林远', '苏婉']`
- **并且** `preservedElements.plotPoints` 包含与 "密室日记" 相关的条目

#### Scenario: 三层压缩逐级升级

- **假设** 目标 token 为 3000，当前 7000 tokens
- **当** 执行 history-compaction 后降至 5500 tokens（未达标）
- **则** 继续执行 micro-compression，降至 4200 tokens（未达标）
- **当** 继续执行 narrative-summarization
- **则** 降至 2800 tokens（达标）
- **并且** `layersApplied` = `['history-compaction', 'micro-compression', 'narrative-summarization']`

---

### Requirement: P2 — 三层压缩策略定义

**第一层：对话历史压缩（history-compaction）**

将时间上较早的连续 user+assistant 对话对合并为精简摘要。

```typescript
/** 对话压缩配置 */
interface HistoryCompactionConfig {
  /** 保留最近 N 轮完整对话（不压缩），默认 3 */
  keepRecentRounds: number;
  /** 合并窗口大小（每 N 轮对话合并为一条摘要），默认 5 */
  mergeWindowSize: number;
  /** 摘要格式模板——叙事感知 */
  summaryTemplate: string;
}
```

规则：
- 最近 `keepRecentRounds` 轮对话**永远保留**，不参与压缩
- 更早的对话按 `mergeWindowSize` 窗口合并
- 合并摘要**必须**包含窗口内出现的角色名和关键事件
- 纯规则型对话（如用户定义创作约束）压缩时保留约束条目，只去除对话包装

**第二层：微压缩（micro-compression）**

对单条长消息进行段内精简，不改变语义。

规则：
- 去除重复表达和冗余修饰词
- 合并连续相似的叙述段落
- 保留所有专有名词（角色名、地名、作品名）
- 保留数字和时间表达
- 不使用 LLM——使用基于规则的文本处理（速度快，无额外成本）

**第三层：叙事感知摘要（narrative-summarization）**

使用 LLM 对压缩后仍超标的内容生成高质量叙事摘要。

```typescript
/** 叙事摘要的 LLM 指令模板 */
const NARRATIVE_SUMMARY_PROMPT = `
你是一个创作助手，正在为长篇小说的 AI 协作系统压缩上下文。

请将以下对话历史压缩为叙事摘要，必须保留：
1. 所有出现的角色名及其在对话中的行为/状态
2. 关键情节推进点
3. 当前的叙述视角和语气基调
4. 尚未解决的伏笔或悬念线索
5. 时间线标记（如"三天后"、"入夜"）

不得丢弃的信息类型：
- 角色名（无论出现频次）
- 地点名
- 用户明确设定的创作约束
- 剧情转折点

可以精简的信息类型：
- 日常闲聊和寒暄
- 重复的修改请求
- 已被否决的写作方案

输出格式：以叙事体摘要形式呈现，不使用列表或表格。
`;
```

规则：
- 使用 `balanced` 级别模型（不需要 `advanced`）
- 摘要长度不超过原文的 30%
- 如果摘要中缺少输入中出现的角色名，标记 `COMPRESSION_NARRATIVE_LOSS` 警告

#### Scenario: 微压缩去除冗余但保留专有名词

- **假设** 单条消息为 "林远他真的真的非常非常生气地走到了门前面，然后他转过头来看着苏婉"
- **当** 执行 micro-compression
- **则** 压缩为类似 "林远怒步走到门前，转头看着苏婉"
- **并且** "林远"、"苏婉" 两个角色名完整保留

#### Scenario: 叙事摘要保留伏笔线索

- **假设** 对话历史中用户提到 "在第三章埋了一个伏笔：林远口袋里有一封未拆的信"
- **当** 执行 narrative-summarization
- **则** 摘要中明确包含 "林远口袋中有未拆信件" 的信息
- **并且** `preservedElements.foreshadowingClues` 包含此条目

---

### Requirement: P2 — 压缩熔断器

The system SHALL implement a circuit breaker that stops compression attempts after 3 consecutive failures, preventing resource waste and user-impacting delays.

```typescript
/** 熔断器配置 */
interface CircuitBreakerConfig {
  /** 连续失败次数阈值，默认 3 */
  failureThreshold: number;
  /** 熔断器打开后的冷却时间（毫秒），默认 300_000（5 分钟） */
  cooldownMs: number;
}

/** 熔断器状态 */
type CircuitBreakerState =
  | 'closed'     // 正常运行，允许压缩
  | 'open'       // 熔断，拒绝压缩请求
  | 'half-open'; // 冷却期结束，允许单次试探性压缩

/** 压缩引擎配置 */
interface CompressionConfig {
  /** 熔断器配置 */
  circuitBreaker: CircuitBreakerConfig;
  /** 压缩超时时间（毫秒），默认 10_000。超时视为熔断器计数的一次失败。 */
  timeoutMs: number;
  /** shouldCompress 的最小绝对 token 阈值，默认 500。低于此值不触发压缩。 */
  minTokenThreshold: number;
}
```

**熔断规则**:
- 连续 3 次 `compress()` 调用失败（抛出异常或返回的 `compressedTokens` > `targetTokens`）→ 熔断器打开
- 熔断器打开后，后续 `compress()` 调用直接返回 `COMPRESSION_CIRCUIT_OPEN` 错误
- 5 分钟冷却期后进入 `half-open`，允许一次试探性压缩
- 试探成功 → 熔断器关闭；试探失败 → 熔断器重新打开
- 用户可通过 `resetCircuitBreaker()` 手动关闭熔断器

**用户通知**:
- 熔断器打开时，通过 IPC 通知前端，状态栏显示警告 "上下文压缩暂时不可用"
- 用户可在设置中手动触发重置

#### Scenario: 连续 3 次失败触发熔断

- **假设** 第 1 次压缩因 LLM 调用超时失败
- **并且** 第 2 次压缩因 LLM 返回空内容失败
- **并且** 第 3 次压缩因 LLM 返回内容反而更长失败
- **当** 第 4 次调用 `compress()`
- **则** 直接抛出 `CompressionError(COMPRESSION_CIRCUIT_OPEN)`
- **并且** 不发起任何 LLM 调用
- **并且** 前端收到通知，状态栏显示压缩不可用警告

#### Scenario: 冷却期后半开探测成功

- **假设** 熔断器已打开 5 分钟
- **当** 系统尝试半开探测压缩
- **并且** 本次压缩成功（compressedTokens ≤ targetTokens）
- **则** 熔断器状态变为 `closed`
- **并且** 后续压缩请求正常处理
- **并且** `consecutiveFailures` 重置为 0

---

### Requirement: P2 — 压缩历史层与上下文组装集成

P2 在 P1 的上下文组装中新增 `compressed-history` 层，位于 `Rules` 和 `Immediate` 之间。

**更新后的层级**:

| 层级 | V1 状态 | P2 状态 | 说明 |
|------|---------|---------|------|
| Rules | ✅ 启用 | ✅ 启用 | 不可裁剪 |
| **Compressed History** | — | 🆕 启用 | 压缩后的对话历史 |
| Settings | ⬜ 空 | ⬜ 空 | 语义记忆等功能在 P2 仍未实现 |
| Retrieved | ⬜ 空 | ⬜ 空 | 检索增强在 P2 仍未实现（P4+ 规划） |
| Immediate | ✅ 启用 | ✅ 启用 | 当前文档上下文 |

**组装流程更新**:

```
P2 组装流程：
1. 加载 Rules 层
2. 🆕 检查 shouldCompress() → 如需压缩，执行 compress()
3. 🆕 将压缩后的历史作为 compressed-history 层
4. 加载 Immediate 层
5. 使用 estimateTokens() 计算各层 token 数
6. 按容量警戒策略处理
7. 计算 stablePrefixHash（P2: 仍仅基于 Rules 层内容，不包含 compressed-history——压缩历史每次变化会导致缓存失效）
```

```typescript
/** P2 更新的组装结果 */
interface P2ContextAssembleResult extends P1ContextAssembleResult {
  layers: {
    rules: { tokens: number; content: string };
    compressedHistory: { tokens: number; compressed: boolean; compressionRatio?: number; content?: string; messages?: LLMMessage[] }; // 🆕
    immediate: { tokens: number; truncated: boolean };
  };
  /** 压缩统计（如果本次触发了压缩） */
  compressionApplied?: boolean;
}
```

#### Scenario: 长对话触发压缩后正常组装

- **假设** 用户与 AI 进行了 30 轮对话，总 token 超过 87% 容量
- **当** P2 Context Engine 组装上下文
- **则** 先对 30 轮对话历史执行压缩
- **并且** 压缩后的历史作为 `compressed-history` 层注入
- **并且** `capacityPercent` 降至 87% 以下
- **并且** `compressionApplied` = `true`

#### Scenario: 短对话不触发压缩

- **假设** 用户只进行了 3 轮对话，总 token 在 60% 容量
- **当** P2 Context Engine 组装上下文
- **则** `shouldCompress()` 返回 `false`
- **并且** 对话历史以原始形式注入（不压缩）
- **并且** `compressionApplied` = `false`

---

### P2 Narrative-Aware Context Compression 不做清单

- ❌ 不做跨文档的上下文压缩（P2 仅压缩当前文档的对话历史）
- ❌ 不做压缩结果的持久化存储（压缩结果仅存在于内存，下次组装重新计算）
- ❌ 不做用户可配置的压缩参数 UI（P2 使用固定默认值）
- ❌ 不做实时流式压缩（压缩在组装时批量执行，非逐条消息压缩）
- ❌ 不做多语言感知压缩（P2 仅优化中文叙事场景，英文走通用路径）

---

#### Scenario: 并发组装背压

- **假设** 同时有 20 个组装请求
- **当** 超过并发上限 4
- **则** 后续请求排队或返回 `CONTEXT_BACKPRESSURE`
- **并且** 已运行请求不超时
