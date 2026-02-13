# P1+P2 集成检查指令

> 检查目标：在进入 Phase 3 之前，验证 P1（AI 可用）和 P2（Codex 上下文）的 13 个 change + 1 个 fix 在代码层面的跨模块集成是否完整、一致、无漂移。
>
> 产出：每个检查项标注 PASS / FAIL / DRIFT，FAIL 和 DRIFT 项必须在进入 P3 前修复或记录为已知债务。

---

## 一、端到端数据流链路验证

P1+P2 的核心价值是打通「用户输入 → AI 面板 → 上下文组装（KG + Memory） → LLM 调用 → 流式返回」的完整链路。以下按实际调用栈逐层验证。

### 1.1 Chain A：AI 技能执行主链路

```
Renderer (aiStore)
  → IPC ai:skill:run
    → ipc/ai.ts registerAiIpcHandlers
      → skillExecutor.execute()
        → assembleContextPrompt() → deps.assembleContext()
          → contextAssemblyService.assemble()
            → rulesFetcher    (KG aiContextLevel="always" 实体)
            → settingsFetcher  (Memory previewInjection 注入)
            → retrievedFetcher (KG aiContextLevel="when_detected" 实体 via matchEntities)
            → immediateFetcher (光标窗口 / additionalInput)
          → contextPrompt = assembled.prompt
        → resolved.data.prompt?.system  (SKILL.md 的 system prompt)
        → deps.runSkill({ systemPrompt: skillPrompt, system: contextPrompt })
          → aiService.runSkill()
            → combineSystemText({ systemPrompt, system: [contextPrompt, modeHint] })
            → LLM HTTP fetch (proxy/openai/anthropic)
    → skill:stream:chunk / skill:stream:done push events
  → Renderer (aiStore) 更新 outputText
```

> **已确认事实**：`assembleSystemPrompt` 和 `GLOBAL_IDENTITY_PROMPT` 在 `aiService.ts` 中仅被 import + re-export，未在任何 LLM 调用路径中使用。实际合并函数是 `combineSystemText`（4 处调用：line 1386/1462/1533/1649）。详见 §7。

**检查命令**：

```bash
# 1.1.1 验证 skillExecutor 是否正确调用 contextAssemblyService.assemble
grep -n "assembleContext" apps/desktop/main/src/ipc/ai.ts apps/desktop/main/src/services/skills/skillExecutor.ts

# 1.1.2 验证 contextAssemblyService 创建时是否注入了 kgService + memoryService
grep -n "createContextLayerAssemblyService" apps/desktop/main/src/ipc/ai.ts

# 1.1.3 验证 entityMatcher 是否作为默认依赖被 layerAssemblyService 使用
grep -n "matchEntities\|defaultMatchEntities" apps/desktop/main/src/services/context/layerAssemblyService.ts

# 1.1.4 验证 assembleSystemPrompt 是否在 runSkill 路径中被调用
grep -n "assembleSystemPrompt\|combineSystemText" apps/desktop/main/src/services/ai/aiService.ts

# 1.1.5 验证流式事件推送是否正确路由到 renderer
grep -n "safeEmitToRenderer\|SKILL_STREAM_CHUNK\|SKILL_STREAM_DONE" apps/desktop/main/src/ipc/ai.ts
```

**已验证结论**：

- [x] `createContextLayerAssemblyService(undefined, deps)` — 第一个参数 `fetchers?: Partial<ContextLayerFetcherMap>`，传 `undefined` 表示全部使用 `defaultFetchers(deps)` 构建。**不是风险点**：当 `kgService` 存在时正确创建 `rulesFetcher` 和 `retrievedFetcher`，当 `memoryService` 存在时正确创建 `settingsFetcher`。
- [x] `matchEntities` 通过 `deps.matchEntities ?? defaultMatchEntities` 自动注入（`layerAssemblyService.ts:1112`）。**已确认工作正常**。
- [x] **P2 context 注入已生效**：`contextAssemblyService.assemble()` 的 `prompt` 通过 `skillExecutor` 的 `system` 参数传入 `aiService.runSkill()`，最终由 `combineSystemText` 合并。
- [ ] `buildLLMMessages` 是否在 runSkill 链路中被调用？P1 增加了这个函数，需确认它被实际使用而非仅被测试覆盖。
- [ ] **`GLOBAL_IDENTITY_PROMPT` 未注入 LLM 调用**——`assembleSystemPrompt` 是死代码（详见 §7），身份提示词不在任何 runSkill 路径中。这是 P3 前必须决策的问题。

### 1.2 Chain B：API Key 存储 → LLM 调用

```
Renderer (AI Settings Panel)
  → IPC ai:proxy:settings:save
    → aiProxySettingsService.save() → safeStorage.encryptString()
  → IPC ai:proxy:settings:get
    → aiProxySettingsService.getRaw() → safeStorage.decryptString()
      → getProxySettings() (in registerAiIpcHandlers)
        → aiService resolveProvider() → buildApiUrl() → fetch()
```

**检查命令**：

```bash
# 1.2.1 验证 getProxySettings 回调是否在 aiService 创建时注入
grep -n "getProxySettings" apps/desktop/main/src/ipc/ai.ts apps/desktop/main/src/services/ai/aiService.ts

# 1.2.2 验证 safeStorage adapter 是否正确传入
grep -n "secretStorage\|safeStorage" apps/desktop/main/src/ipc/ai.ts apps/desktop/main/src/services/ai/aiProxySettingsService.ts

# 1.2.3 验证 provider 解析逻辑覆盖三种模式
grep -n "providerMode\|openai-compatible\|openai-byok\|anthropic-byok" apps/desktop/main/src/services/ai/aiProxySettingsService.ts
```

**关注点**：

- [ ] `safeStorage` 在 Linux 环境下是否可用？CI 环境是否需要 mock？
- [ ] API Key 解密失败时，是否返回 `AI_PROVIDER_UNAVAILABLE` 错误码而非 crash？
- [ ] provider mode 三选一逻辑是否完整：`openai-compatible` / `openai-byok` / `anthropic-byok`？

### 1.3 Chain C：KG 实体 → Context Rules/Retrieved 层

```
KG DB (entities table with aiContextLevel + aliases)
  → kgService.entityList({ filter: { aiContextLevel: "always" } })
    → rulesFetcher → formatEntityForContext() → rules 层 chunks
  → kgService.entityList({ filter: { aiContextLevel: "when_detected" } })
    → matchEntities(cursorText, entities)
      → retrievedFetcher → formatEntityForContext() → retrieved 层 chunks
```

**检查命令**：

```bash
# 1.3.1 验证 kgService.entityList 是否支持 aiContextLevel filter
grep -n "aiContextLevel\|filter" apps/desktop/main/src/services/kg/kgService.ts | head -30

# 1.3.2 验证 aliases 字段是否在 entity 查询结果中返回
grep -n "aliases" apps/desktop/main/src/services/kg/kgService.ts | head -20

# 1.3.3 验证 DB migration 是否添加了 aiContextLevel + aliases 列
grep -rn "aiContextLevel\|aliases" apps/desktop/main/src/db/

# 1.3.4 验证 IPC 层 knowledgeGraph.ts 是否暴露了 aliases 和 aiContextLevel
grep -n "aliases\|aiContextLevel" apps/desktop/main/src/ipc/knowledgeGraph.ts | head -20
```

**关注点**：

- [ ] `kgService.entityList` 的 `filter` 参数类型是否包含 `aiContextLevel` 过滤？
- [ ] `aliases` 是 `string[]` 还是序列化的 JSON string？DB 层和 Service 层的序列化/反序列化是否一致？
- [ ] issue-499 修复的 IPC 契约是否完全对齐？验证 shared types 和实际 IPC handler 的 aliases 字段。
- [ ] `when_detected` 实体在 KG 为空时，retrievedFetcher 是否返回空 chunks 而非报错？

### 1.4 Chain D：Memory 注入 → Settings 层

```
memoryService.previewInjection({ projectId, documentId })
  → settingsFetcher → formatInjectionContent()
    → settings 层 chunk (source: "memory:injection")
      → layerAssemblyService assemble → contextOverlay
```

**检查命令**：

```bash
# 1.4.1 验证 memoryService 类型是否包含 previewInjection 方法
grep -n "previewInjection" apps/desktop/main/src/services/memory/memoryService.ts | head -10

# 1.4.2 验证 MemoryInjectionItem 类型是否包含 content + origin 字段
grep -n "MemoryInjectionItem" apps/desktop/main/src/services/memory/memoryService.ts | head -10

# 1.4.3 验证 settingsFetcher 的降级 warning 是否使用标准 warning 字符串
grep -n "MEMORY_UNAVAILABLE\|MEMORY_DEGRADED" apps/desktop/main/src/services/context/fetchers/settingsFetcher.ts
```

**关注点**：

- [ ] `previewInjection` 返回的 `diagnostics?.degradedFrom` 字段是否在 memoryService 中实际实现？
- [ ] Memory 数据为空时（新项目），settingsFetcher 是否正确返回空 chunks 而非 warning？
- [ ] `formatInjectionContent` 的输出格式是否与 P3 即将增加的技能提示词兼容？

---

## 二、Token 预算一致性

P1+P2 在三个位置引入了 token 估算逻辑，必须验证一致性。

### 2.1 estimateTokenCount 实现对比

| 位置 | 文件 | 实现 |
|------|------|------|
| A | `layerAssemblyService.ts:260` | `new TextEncoder().encode(text).length / 4` |
| B | `aiService.ts:199` | `Buffer.byteLength(text, "utf8") / 4` |
| C | `buildLLMMessages.ts:31` | `Buffer.byteLength(text, "utf8") / 4` |
| D | `ipc/ai.ts:154` | `Buffer.byteLength(text, "utf8") / 4` |

**检查命令**：

```bash
# 2.1.1 列出所有 estimateTokenCount / estimateMessageTokens 实现
grep -rn "function estimateToken\|function estimateMessage" apps/desktop/main/src/
```

**已验证结论 + 待验证项**：

- [x] `TextEncoder().encode().length`（位置 A）和 `Buffer.byteLength(text, "utf8")`（位置 B/C/D）对任何 UTF-8 文本字节计算结果**完全一致**。`TextEncoder` 标准输出 UTF-8，`Buffer.byteLength` 以 UTF-8 计字节。无需额外验证。
- [ ] 是否存在 token 预算被 context assembly 消耗后，buildLLMMessages 再次计算导致双重预算扣减的情况？Context Engine 预算 `DEFAULT_TOTAL_BUDGET_TOKENS = 6000` 控制上下文层输出总量；`buildLLMMessages` 的 `maxTokenBudget` 控制 LLM 消息数组总量。两者是不同维度——前者限制 system prompt 的上下文部分，后者限制完整消息数组。需确认 `maxTokenBudget` 的实际来源和取值。
- [ ] `DEFAULT_TOTAL_BUDGET_TOKENS = 6000`（context engine）与 `DEFAULT_SESSION_TOKEN_BUDGET = 200_000`（AI service，会话级）的关系：前者是单次上下文组装的 token 上限，后者是整个会话的累计 token 计量上限。`6000` 远小于主流模型窗口（128k+），不存在 context 超出 LLM 窗口的风险。

### 2.2 预算分层检查

```bash
# 2.2.1 Context Engine 默认预算配置
grep -n "DEFAULT_TOTAL_BUDGET\|ratio\|minimumTokens" apps/desktop/main/src/services/context/layerAssemblyService.ts | head -20

# 2.2.2 buildLLMMessages 的 maxTokenBudget 来源
grep -n "maxTokenBudget\|tokenBudget" apps/desktop/main/src/services/ai/buildLLMMessages.ts apps/desktop/main/src/ipc/ai.ts
```

---

## 三、IPC 契约一致性

### 3.1 Cross-Module Contract Baseline 对齐

`openspec/guards/cross-module-contract-baseline.json` 定义了期望通道和错误码。

**检查命令**：

```bash
# 3.1.1 验证 baseline 中的 channel 是否全部有 IPC handler 注册
for ch in "memory:episode:record" "memory:trace:get" "memory:trace:feedback" \
  "knowledge:query:relevant" "knowledge:query:byids" "knowledge:query:subgraph" \
  "project:project:switch" "ai:skill:run" "skill:stream:chunk" "skill:stream:done" \
  "ai:skill:cancel" "ai:chat:send" "export:project:bundle"; do
  echo "=== $ch ==="
  grep -rn "\"$ch\"" apps/desktop/main/src/ipc/ apps/desktop/preload/src/ packages/shared/types/
done

# 3.1.2 验证 baseline 中的错误码是否在代码中使用
for code in "KG_QUERY_TIMEOUT" "VALIDATION_ERROR" "IPC_TIMEOUT" \
  "MEMORY_BACKPRESSURE" "SKILL_TIMEOUT" "AI_PROVIDER_UNAVAILABLE" \
  "CONTEXT_SCOPE_VIOLATION"; do
  echo "=== $code ==="
  grep -rn "\"$code\"" apps/desktop/main/src/
done

# 3.1.3 验证 ipc-generated.ts 中的 channel 类型与实际注册是否匹配
wc -l packages/shared/types/ipc-generated.ts
grep -c "ipcMain.handle" apps/desktop/main/src/ipc/*.ts
```

**关注点**：

- [ ] baseline 中的 `knowledge:query:relevant` / `knowledge:query:byids` / `knowledge:query:subgraph` 是否在 P2 中已实现？还是仅在 cross-module-integration-spec.md 中定义但未实现？
- [ ] `memory:episode:record` / `memory:trace:get` / `memory:trace:feedback` 是否已实现？这些是 Editor ↔ Memory 的通道，可能要到 P3/P4 才实现。
- [ ] 已实现的通道和仅在 spec 中的通道，需要明确区分，输出 delta report。

### 3.2 Shared Types 一致性

```bash
# 3.2.1 验证 shared types 是否被 main 和 renderer 正确引用
grep -rn "from.*packages/shared/types" apps/desktop/main/src/ | head -20
grep -rn "from.*packages/shared/types" apps/desktop/renderer/src/ | head -20

# 3.2.2 验证 KgRulesInjectionEntity (shared) vs KnowledgeEntity (kgService) 的字段差异
grep -n "type KgRulesInjectionEntity" packages/shared/types/kg.ts
grep -n "type KnowledgeEntity\|export type KnowledgeEntity" apps/desktop/main/src/services/kg/kgService.ts | head -5

# 3.2.3 验证 AiStreamEvent 类型在 preload 和 renderer 中是否一致使用
grep -rn "AiStreamEvent\|AiStreamChunkEvent\|AiStreamDoneEvent" apps/desktop/preload/src/ apps/desktop/renderer/src/stores/
```

**关注点**：

- [ ] `KgRulesInjectionEntity`（shared/types/kg.ts）和 `KnowledgeEntity`（kgService.ts）是两个不同类型——哪些代码路径使用哪个？是否有转换遗漏？
- [ ] Preload 层的 `aiStreamBridge.ts` 是否正确转发了所有 `AiStreamEvent` 子类型？

---

## 四、数据模型 & DB Migration 完整性

### 4.1 KG Schema 变更（P2 新增字段）

```bash
# 4.1.1 验证 aiContextLevel 列存在且有默认值
grep -rn "aiContextLevel\|ai_context_level" apps/desktop/main/src/db/

# 4.1.2 验证 aliases 列存在且序列化方式
grep -rn "aliases" apps/desktop/main/src/db/ | head -20

# 4.1.3 验证 migration 顺序和 version
ls -la apps/desktop/main/src/db/migrations/ 2>/dev/null || echo "Check migration mechanism"
grep -rn "migration\|schema_version\|PRAGMA user_version" apps/desktop/main/src/db/
```

**关注点**：

- [ ] `aliases` 在 SQLite 中是否存为 JSON string？`kgService` 查询后是否正确 `JSON.parse`？
- [ ] `aiContextLevel` 默认值是 `"never"` 还是 `"when_detected"`？对已有实体的迁移行为是什么？
- [ ] 是否有 migration 回滚机制？P2 的两个 migration 是否可以独立回滚？

### 4.2 aiStore 消息模型（P1 新增）

```bash
# 4.2.1 验证 aiStore messages 与 chatMessageManager 的类型对齐
grep -n "type ChatMessage\|interface ChatMessage" apps/desktop/main/src/services/ai/chatMessageManager.ts
grep -n "ChatHistoryMessage" apps/desktop/main/src/ipc/ai.ts | head -5

# 4.2.2 验证 aiStore 前端消息类型
grep -n "messages\|ChatMessage\|addMessage\|clearMessages" apps/desktop/renderer/src/stores/aiStore.ts | head -20
```

**关注点**：

- [ ] `ChatMessage`（chatMessageManager）和 `ChatHistoryMessage`（ipc/ai.ts）是两个不同类型。IPC 返回的是后者，前端存的是什么？是否有字段丢失？
- [ ] `chatHistoryByProject` 是内存 Map，重启后丢失。是否有持久化计划？P4 的 `p4-trace-persistence` 是否覆盖？

---

## 五、降级 & 错误处理完整性

### 5.1 KG 不可用降级

```bash
# 5.1.1 rulesFetcher KG 降级路径
grep -n "KG_UNAVAILABLE\|catch" apps/desktop/main/src/services/context/fetchers/rulesFetcher.ts

# 5.1.2 retrievedFetcher KG 降级路径
grep -n "KG_UNAVAILABLE\|ENTITY_MATCH_FAILED\|catch" apps/desktop/main/src/services/context/fetchers/retrievedFetcher.ts

# 5.1.3 验证降级 warning 是否传播到最终 ContextAssembleResult
grep -n "warnings" apps/desktop/main/src/services/context/layerAssemblyService.ts | head -20
```

**必须验证的 Scenario**（可用现有测试或需新增）：

| # | Scenario | 期望行为 | 测试文件 |
|---|----------|----------|----------|
| D1 | KG service 返回 `{ ok: false }` | rulesFetcher 返回空 chunks + `KG_UNAVAILABLE` warning | `rulesFetcher.test.ts` |
| D2 | KG service 抛出异常 | rulesFetcher catch → 空 chunks + warning | `rulesFetcher.test.ts` |
| D3 | entityMatcher 抛出异常 | retrievedFetcher catch → 空 chunks + `ENTITY_MATCH_FAILED` | `retrievedFetcher.test.ts` |
| D4 | memoryService.previewInjection 返回 `{ ok: false }` | settingsFetcher → 空 chunks + `MEMORY_UNAVAILABLE` | `settingsFetcher.test.ts` |
| D5 | 所有 fetcher 降级 | assemble 仍返回结果（仅 warnings 非空） | **需验证** |
| D6 | API Key 缺失 | aiService 返回 `AI_PROVIDER_UNAVAILABLE` | **需验证** |
| D7 | LLM provider 超时 | `SKILL_TIMEOUT` 错误码 + `skill:stream:done` 事件 | **需验证** |

### 5.2 错误码覆盖度

```bash
# 5.2.1 列出代码中实际使用的所有 IPC 错误码
grep -rohn '"[A-Z_]*"' apps/desktop/main/src/ | sort -u | grep -E "^[A-Z_]{5,}$" || \
  grep -rn "code:" apps/desktop/main/src/ipc/ apps/desktop/main/src/services/ | grep -oP '"[A-Z_]+"' | sort -u
```

---

## 六、测试覆盖度 Gap 分析

### 6.1 P1 测试覆盖

| Change | 关键文件 | 测试文件 | 状态 |
|--------|----------|----------|------|
| p1-identity-template | `identityPrompt.ts` | `identityPrompt.test.ts` | ✅ |
| p1-assemble-prompt | `assembleSystemPrompt.ts` | `assembleSystemPrompt.test.ts` | ✅ |
| p1-chat-skill | `skillRouter.ts` + `skills/chat/SKILL.md` | `skillRouter.test.ts` + `chatSkill.test.ts` | ✅ |
| p1-aistore-messages | `chatMessageManager.ts` | `chatMessageManager.test.ts` | ✅ |
| p1-multiturn-assembly | `buildLLMMessages.ts` | `buildLLMMessages.test.ts` | ✅ |
| p1-apikey-storage | `aiProxySettingsService.ts` | `llm-proxy-config.test.ts` | ✅ |
| p1-ai-settings-ui | renderer components | **需验证前端测试** | ? |

### 6.2 P2 测试覆盖

| Change | 关键文件 | 测试文件 | 状态 |
|--------|----------|----------|------|
| p2-kg-context-level | `kgService.ts` (entityList filter) | `kgService.contextLevel.test.ts` | ✅ |
| p2-kg-aliases | `kgService.ts` (aliases CRUD) | `kgService.aliases.test.ts` | ✅ |
| p2-entity-matcher | `entityMatcher.ts` | `entityMatcher.test.ts` | ✅ |
| p2-fetcher-always | `rulesFetcher.ts` | `rulesFetcher.test.ts` | ✅ |
| p2-fetcher-detected | `retrievedFetcher.ts` | `retrievedFetcher.test.ts` | ✅ |
| p2-memory-injection | `settingsFetcher.ts` | `settingsFetcher.test.ts` | ✅ |
| fix-499 | KG aliases IPC | `kgService.aliases.test.ts` | ✅ |

**检查命令**：

```bash
# 6.3 运行全量测试
cd apps/desktop && pnpm vitest run --reporter=verbose 2>&1 | tail -50

# 6.4 查看覆盖率
cd apps/desktop && pnpm vitest run --coverage 2>&1 | tail -30
```

### 6.5 缺失的集成测试

以下场景有单元测试但缺乏跨模块集成测试：

| # | 缺失场景 | 涉及模块 | 优先级 |
|---|----------|----------|--------|
| G1 | 完整 AI skill:run → context assemble → LLM mock → stream 返回 | AI + Context + KG + Skill | **HIGH** |
| G2 | KG 实体变更 → rules/retrieved fetcher 输出变更 | KG + Context | MEDIUM |
| G3 | API Key 保存 → 读取 → LLM 调用成功 | Workbench + AI | MEDIUM |
| G4 | 多轮对话：message add → build → trim → 第 N 轮 | AI + aiStore | MEDIUM |
| G5 | 全降级场景：KG 不可用 + Memory 不可用 → AI 仍可用 | All | **HIGH** |

---

## 七、assembleSystemPrompt 与 GLOBAL_IDENTITY_PROMPT 未接入 LLM 调用链路（已确认）

### 7.1 事实

| 函数/常量 | 定义位置 | aiService.ts 内状态 | 实际 LLM 调用中是否使用 |
|-----------|----------|--------------------|-----------------------|
| `assembleSystemPrompt` | `assembleSystemPrompt.ts` | import + re-export (line 17, 20) | **否**——零处内部调用 |
| `GLOBAL_IDENTITY_PROMPT` | `identityPrompt.ts` | import + re-export (line 18, 20) | **否**——零处内部调用 |
| `combineSystemText` | `aiService.ts:160` (内部函数) | 4 处调用 (line 1386/1462/1533/1649) | **是**——所有 LLM provider 路径均使用 |

### 7.2 实际 system prompt 组成

当前 LLM 调用的 system message 由 `combineSystemText` 拼接：

```
systemPrompt (来自 SKILL.md 的 system prompt)
+ "\n\n" +
system (来自 contextAssemblyService.assemble().prompt + modeHint)
```

缺失的部分：
- **`GLOBAL_IDENTITY_PROMPT`**（AI 身份、写作意识、角色流动性）未注入
- **`userRules`**（用户自定义规则）未注入
- **`memoryOverlay`** 已通过 settingsFetcher → context assembly 间接注入，但不在 `assembleSystemPrompt` 的分层框架中

### 7.3 影响评估

- **P2 context/memory 注入已生效**：KG 实体和 Memory 偏好通过 `contextAssemblyService.assemble()` → `skillExecutor` → `aiService.runSkill({ system: contextPrompt })` → `combineSystemText` 正确进入 LLM 调用。
- **P1 identity 未生效**：`GLOBAL_IDENTITY_PROMPT` 中定义的写作意识、角色流动性、行为约束等均未注入 LLM。AI 当前无身份定义。
- **`assembleSystemPrompt` 是死代码**：6 层分层组装函数有测试覆盖但无运行时调用方。

### 7.4 决策项（BLOCKER）

进入 P3 前必须决策：
- **方案 A**：在 `skillExecutor` 或 `aiService.runSkill` 中接入 `assembleSystemPrompt`，替换 `combineSystemText`，让 identity/userRules/modeHint 正式进入分层组装。
- **方案 B**：在 `combineSystemText` 调用前手动注入 `GLOBAL_IDENTITY_PROMPT`，保持现有简单拼接架构。
- **方案 C**：记录为已知债务，P3 写作技能上线时统一处理（风险：P3 技能依赖身份提示词）。

---

## 八、Preload 层安全边界

```bash
# 8.1 验证 preload 暴露的 API 表面
cat apps/desktop/preload/src/index.ts
cat apps/desktop/preload/src/ipcGateway.ts

# 8.2 验证 aiStreamBridge 是否转发所有 event 类型
grep -n "chunk\|done\|queue" apps/desktop/preload/src/aiStreamBridge.ts

# 8.3 验证 contextBridge 是否限制了允许的 channel
grep -n "allowedChannels\|validChannels\|channel" apps/desktop/preload/src/ipcGateway.ts | head -20
```

**关注点**：

- [ ] P1 新增的 `ai:skill:run` / `ai:chat:send` 等通道是否在 preload allowedChannels 中注册？
- [ ] P2 新增的 KG 相关通道（如果有前端调用）是否在 allowedChannels 中？
- [ ] `aiStreamBridge` 是否处理了 P1 新增的 `AiQueueStatusEvent` 类型？

---

## 九、cross-module-integration-spec.md Delta Report

对照 `openspec/specs/cross-module-integration-spec.md` 中定义的 Scenario，标注实现状态。

| Spec Scenario | 状态 | 证据 |
|---------------|------|------|
| 选区改写被接受后写入情景记忆 (Editor→Memory) | **未实现** | P3/P4 范围 |
| 应用后撤销触发延迟负反馈 (Editor→Memory) | **未实现** | P4 范围 |
| Context Engine 注入相关实体到 Rules 层 (KG→CE) | **已实现** | P2 rulesFetcher |
| KG 不可用时 Context Engine 降级 (KG→CE) | **已实现** | P2 rulesFetcher + retrievedFetcher |
| AI Service 选择技能并流式返回 (AI→Skill) | **已实现** | P1 aiService + skillExecutor |
| 技能超时触发统一错误 (AI→Skill) | **已实现** | P1 SKILL_TIMEOUT |
| 契约校验通过并生成代码 (IPC) | **部分实现** | ipc-generated.ts 存在但自动生成机制待验证 |
| 契约冲突触发阻断 (IPC) | **未验证** | CI check 是否覆盖？ |
| 跨模块高并发保持链路一致 (NFR) | **未验证** | 无并发测试 |
| 跨模块越权访问被拒绝 (NFR) | **部分实现** | CONTEXT_SCOPE_VIOLATION 在 layerAssemblyService |

---

## 十、执行清单（按优先级）

### BLOCKER（必须在 P3 前修复）

1. **`GLOBAL_IDENTITY_PROMPT` 未接入 LLM 调用链路**（§7 已确认）——AI 当前无身份定义、无写作意识、无角色流动性约束。P3 写作技能直接依赖这些能力。必须在 P3 前选择方案 A/B/C 并实施。
2. **`assembleSystemPrompt` 是死代码**（§7 已确认）——6 层分层组装函数未在运行时被调用。需决策是否接入或移除。
3. **运行全量 `pnpm vitest run`**——确认 0 failure。

### PASS（已验证无风险）

- ~~`createContextLayerAssemblyService` 第一个参数 `undefined`~~ → `defaultFetchers(deps)` 正确构建全部 4 个 fetcher，无遗漏。
- ~~P2 context/memory 注入未接入~~ → 已确认通过 `skillExecutor → system param → combineSystemText` 正确流入 LLM 调用。
- ~~Token 估算不一致~~ → `TextEncoder` 和 `Buffer.byteLength` 对 UTF-8 结果完全一致。

### HIGH（建议 P3 前修复）

4. 补充 G1 集成测试：完整 skill:run → context assemble → LLM mock → stream。
5. 补充 G5 集成测试：全降级场景（KG 不可用 + Memory 不可用 → AI 仍可用）。
6. 确认 `buildLLMMessages` 是否在 runSkill 路径中被实际调用（而非仅测试覆盖）。

### MEDIUM（可在 P3 并行处理）

7. 标注 cross-module-contract-baseline.json 中未实现的 channel（产出 delta report）。
8. 验证 ChatMessage vs ChatHistoryMessage 类型一致性。
9. 确认 DB migration 的 aliases 序列化一致性。
10. 验证 preload allowedChannels 完整性。

---

## 十一、执行方式

```bash
# Step 1: 全量测试
cd /home/leeky/work/CreoNow && pnpm vitest run --reporter=verbose

# Step 2: TypeScript 类型检查
cd /home/leeky/work/CreoNow && pnpm tsc --noEmit

# Step 3: 按上述检查命令逐项执行，结果记录到下方

# Step 4: 产出 PASS/FAIL/DRIFT 清单
```

---

## 十二、结果记录区

> 执行检查后，在此记录每项结果。

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 1.1 Chain A 主链路 | | |
| 1.2 Chain B API Key | | |
| 1.3 Chain C KG→Context | | |
| 1.4 Chain D Memory→Settings | | |
| 2.1 Token 估算一致性 | | |
| 3.1 Contract Baseline 对齐 | | |
| 3.2 Shared Types 一致性 | | |
| 4.1 KG Schema 完整性 | | |
| 4.2 aiStore 消息模型 | | |
| 5.1 降级覆盖 | | |
| 6.x 测试覆盖 | | |
| 7.1 assembleSystemPrompt 接入 | FAIL | 死代码，未在 LLM 调用链路中使用 |
| 7.2 GLOBAL_IDENTITY_PROMPT 注入 | FAIL | 未注入任何 runSkill 路径 |
| 7.3 P2 context 注入 | PASS | 通过 combineSystemText 正确流入 |
| 8.x Preload 安全边界 | | |
