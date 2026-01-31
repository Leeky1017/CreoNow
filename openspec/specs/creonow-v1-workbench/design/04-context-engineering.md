# 04 - Context Engineering（layers / stablePrefixHash / redaction / `.creonow`）

> 上游 Requirement：`CNWB-REQ-060`  
> 目标：定义 CN 的上下文工程边界与可验收条款（稳定前缀、预算裁剪证据、脱敏、watch 与可视化）。

---

## 1. 上下文分层（CN V1 固定）

CN V1 的上下文层为 4 层（注入顺序固定）：

1. `rules`：规则（写作风格、术语、禁用词、约束）
2. `settings`：项目设定（世界观、角色设定、背景资料等）
3. `retrieved`：检索/召回结果（RAG、KG、语义记忆召回等）
4. `immediate`：即时上下文（选区、前后文、用户指令、当前任务）

约束：

- `rules/settings` 在 CN 中属于**稳定前缀候选**（见 §3），但必须支持 token budget 与裁剪证据（见 §4）。
- `retrieved/immediate` 属于**动态层**，不得影响 `stablePrefixHash` 口径。

---

## 2. `.creonow/` 目录语义（项目隐藏目录）

> 对标 WN `.writenow/`，但 CN 必须改名且不得双栈并存。

### 2.1 目录结构（MUST）

项目根目录下必须存在 `.creonow/`（由 `context:creonow:ensure` 创建）：

```
<projectRoot>/
  .creonow/
    rules/
      style.md
      terminology.json
      constraints.json
    settings/
      *.md
      *.txt
      *.json
    skills/
      **/*  # project scope skills（见 design/06-skill-system.md）
    characters/
      *.md | *.json
    conversations/
      *.json
    cache/
      *.json
```

约束：

- `.creonow/**` 仅用于“AI 辅助元数据”（rules/settings/skills/characters/conversations/cache 等），不得把用户文档 SSOT 放进这里。
- 在 prompt/viewer/log 中引用文件路径时 MUST 使用 project-relative 路径（例如 `.creonow/settings/世界观.md`），禁止绝对路径。

### 2.1.1 Constraints SSOT（MUST：写死，禁止双栈）

- `.creonow/rules/constraints.json` MUST 作为 constraints 的 **SSOT**（project 作用域）。`constraints:get/set` 必须读写该文件（或等价的 project-relative 文件），不得再引入第二份 DB SSOT。
- constraints 的内容属于 `rules` 层：变更必须可解释且可验收（会影响 `stablePrefixHash`，见 §3）。
- 若文件不存在：`constraints:get` MUST 返回默认值（并可选地在 ensure 时落盘默认文件），但行为必须确定且可测。

### 2.2 IPC 通道（V1 必须）

`context:creonow:*` 的最小覆盖（见 `spec.md` 的 IPC 清单）：

- `context:creonow:ensure({ projectId })` → `{ rootPath, ensured:true }`
- `context:creonow:status({ projectId })` → `{ exists, watching, rootPath? }`
- `context:creonow:watch:start({ projectId })` / `context:creonow:watch:stop({ projectId })`
- `context:creonow:rules:get({ projectId })`
- `context:creonow:settings:list({ projectId })` / `context:creonow:settings:read({ projectId, path })`
- `context:creonow:conversations:list/read/save/analysis:update`（P1 可裁剪，但必须写入任务卡依赖）

---

## 3. Stable Prefix（稳定前缀）与 Hash 验收口径

### 3.1 stable vs dynamic（MUST）

上下文组装必须拆分为：

- `systemPrompt`（稳定前缀候选）：包含固定模板 + rules/settings 的**确定性序列化结果** + 固定空占位
- `userContent`（动态层）：包含 retrieved/immediate（选区/指令/检索结果/对话摘要）

必须满足：

- 主进程/后端不得 trim/normalize prompt 字节（避免破坏缓存命中与可审计性）。
- “Append-only” 原则：在同一模板内，动态内容必须追加到末尾；不得在稳定章节中间插入/删除/重排。

### 3.2 Hash 定义（MUST）

- `stablePrefixHash = hash(systemPromptStablePart)`（只基于稳定前缀部分）
- `promptHash = hash(systemPromptStablePart + userContent)`（全量）

验收：

- 只改 `userContent` → `stablePrefixHash` 不变
- 改 `rules/settings` → `stablePrefixHash` 必然变化且可解释

> Hash 算法可用 FNV-1a 32-bit hex（参考 WN），或更强 hash；但口径必须稳定且可测试。

---

## 4. Token budget 与裁剪证据（必须可视化）

### 4.1 Budget 模型（V1 固定结构）

系统必须为每次 AI run 产出以下诊断结构（用于 UI 与 E2E 断言）：

```ts
type ContextBudget = {
  maxInputTokens: number;
  estimate: {
    rulesTokens: number;
    settingsTokens: number;
    retrievedTokens: number;
    immediateTokens: number;
    totalTokens: number;
  };
};

type TrimEvidence = Array<{
  layer: "rules" | "settings" | "retrieved" | "immediate";
  sourceRef: string; // e.g. ".creonow/settings/世界观.md"
  action: "kept" | "trimmed" | "dropped";
  reason: "over_budget" | "too_large" | "invalid_format" | "read_error";
  beforeChars: number;
  afterChars: number;
}>;
```

### 4.2 裁剪策略（MUST）

- 裁剪顺序必须确定（例如：先 `retrieved` 再 `settings`，最后才 `rules`）。
- 裁剪必须留下证据（TrimEvidence），并可在 context viewer 展示。

---

## 5. Redaction（脱敏）规则（必须可断言）

### 5.1 需要脱敏的内容（最小集合）

- API keys（形如 `sk-`、`AKIA...`、`gho_...` 等常见 token 前缀）
- 绝对路径（Windows：`C:\Users\...`；Unix：`/home/...`）
- 其他敏感标记：可扩展，但必须写入 `patternId` 与测试用例

### 5.2 脱敏作用域（MUST）

- context viewer：必须脱敏（展示 `***REDACTED***`）
- logs：必须脱敏（禁止落 prompt 明文）
- prompt 注入：来自 `.creonow/**` 的内容若命中敏感规则，必须在进入 prompt 前脱敏（避免把秘密发给模型）

### 5.3 脱敏证据（MUST）

系统必须产出结构化证据（用于 UI/E2E）：

```ts
type RedactionEvidence = Array<{
  patternId: string;
  sourceRef: string;
  matchCount: number;
}>;
```

---

## 6. Context Viewer（可视化与可测）

### 6.1 UI 最小要求

- 展示四层内容：`rules/settings/retrieved/immediate`
- 展示 token 估算与裁剪证据
- 展示 redaction evidence
- 展示 `stablePrefixHash` 与 `promptHash`

### 6.2 稳定选择器（必须）

- `ai-context-toggle`
- `ai-context-panel`
- `ai-context-layer-rules`
- `ai-context-layer-settings`
- `ai-context-layer-retrieved`
- `ai-context-layer-immediate`
- `ai-context-trim`

---

## 7. E2E 验收场景（Windows 门禁）

必须覆盖：

1. 启动 app → 创建项目 → `context:creonow:ensure`
2. 开启 watch：`context:creonow:watch:start`
3. 写入 `.creonow/rules/style.md`，包含敏感 token（例如 `apiKey=sk-THIS_SHOULD_BE_REDACTED`）
4. 写入一个超大 settings 文件（触发裁剪证据）
5. 运行一个 builtin skill（fake AI）
6. 打开 context viewer：
   - 断言 4 层存在
   - 断言路径引用为 `.creonow/...` 相对路径
   - 断言出现 `***REDACTED***` 且不包含原始 token
   - 断言存在裁剪证据 UI

---

## Reference (WriteNow)

参考路径：

- `WriteNow/openspec/specs/sprint-ai-memory/spec.md`（stable prefix / append-only / masking）
- `WriteNow/tests/e2e/sprint-2.5-context-engineering-context-viewer.spec.ts`（watch + redaction + viewer 断言形态）
- `WriteNow/electron/ipc/context.cjs`（context:ensure/watch 的实现边界）

从 WN 借鉴并迁移到 CN 的关键约束（摘要）：

- 稳定前缀必须可验收（hash 可断言），且“动态内容不应破坏缓存收益”的边界必须写死。
- redaction 不是“UI 小优化”，而是安全门禁：viewer/log/prompt 注入都必须覆盖。
