# P1+P2 集成检查指令

> 在进入 Phase 3 之前，验证 P1（AI 可用）和 P2（Codex 上下文）的 13 个 change + 1 个 fix 在代码层面的跨模块集成是否完整、一致、无漂移。

---

## 〇、已确认 PASS 项（无需再查）

| 检查项                                                 | 结论                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `createContextLayerAssemblyService` 第一参 `undefined` | `defaultFetchers(deps)` 正确构建全部 4 个 fetcher，无遗漏                                                                      |
| P2 context/memory 注入是否接入 LLM                     | 已确认：`contextAssemblyService.assemble().prompt` → `skillExecutor` → `system` param → `combineSystemText` 正确流入           |
| Token 估算 `TextEncoder` vs `Buffer.byteLength`        | 完全一致（均 UTF-8 字节 / 4）                                                                                                  |
| P1 单元测试覆盖（6/7 change）                          | identityPrompt / assembleSystemPrompt / skillRouter+chatSkill / chatMessageManager / buildLLMMessages / llm-proxy-config 全 ✅ |
| P2 单元测试覆盖（6 change + 1 fix）                    | kgService.contextLevel / kgService.aliases / entityMatcher / rulesFetcher / retrievedFetcher / settingsFetcher 全 ✅           |
| Context budget 6000 vs LLM 窗口 128k+                  | 6000 为单次上下文组装上限，远小于模型窗口，无溢出风险                                                                          |

---

## 一、已处理：assembleSystemPrompt 与 GLOBAL_IDENTITY_PROMPT 已接入 LLM 调用链路

### 事实

| 符号                     | 位置                      | 运行时调用                                                                   |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `assembleSystemPrompt`   | `assembleSystemPrompt.ts` | 已接入（由 `combineSystemText` 调用，进入所有 provider 请求组装路径）        |
| `GLOBAL_IDENTITY_PROMPT` | `identityPrompt.ts`       | 已接入（由 `combineSystemText` 注入 `globalIdentity`）                       |
| `combineSystemText`      | `aiService.ts:160`        | **4 处**（line 1378/1451/1521/1634，所有 LLM provider 的 stream/non-stream） |

当前 system message 由 `assembleSystemPrompt` 分层构建，包含 identity + skill + mode + context。

### 决策项（P3 前必须选择并实施）

- **A（已实施）**：在 `aiService.runSkill` 运行时链路接入 `assembleSystemPrompt`（Issue #509）
- **B**：无需执行（被 A 覆盖）
- **C**：无需执行（不再作为债务延期）

---

## 二、待验证项

### 2.1 端到端链路（未验证部分）

主链路调用栈（已确认段省略）：

```
skillExecutor.execute()
  → assembleContextPrompt() → contextAssemblyService.assemble()
  → deps.runSkill({ systemPrompt: skillPrompt, system: contextPrompt })
    → aiService.runSkill() → combineSystemText() → LLM HTTP fetch
  → skill:stream:chunk / skill:stream:done → Renderer
```

- [ ] `buildLLMMessages` 是否在 runSkill 路径中被实际调用？
- [ ] `safeStorage` 在 Linux CI 环境是否可用（需 mock？）
- [ ] API Key 解密失败时是否返回 `AI_PROVIDER_UNAVAILABLE` 而非 crash
- [ ] KG aliases DB 序列化/反序列化一致性（`string[]` vs JSON string）
- [ ] `when_detected` 实体在 KG 为空时，retrievedFetcher 返回空 chunks 而非报错
- [ ] Memory 数据为空时（新项目），settingsFetcher 返回空 chunks 而非 warning

### 2.2 IPC 契约 delta

对照 `openspec/guards/cross-module-contract-baseline.json` 中 13 个 channel 和 12 个错误码，区分已实现 vs 仅 spec：

```bash
for ch in "memory:episode:record" "memory:trace:get" "memory:trace:feedback" \
  "knowledge:query:relevant" "knowledge:query:byids" "knowledge:query:subgraph" \
  "project:project:switch" "ai:skill:run" "skill:stream:chunk" "skill:stream:done" \
  "ai:skill:cancel" "ai:chat:send" "export:project:bundle"; do
  echo "=== $ch ===" && grep -rn "\"$ch\"" apps/desktop/main/src/ipc/ packages/shared/types/
done
```

### 2.3 降级场景（需补充集成测试）

| Scenario          | 期望行为                           | 现有测试                                                          |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------- |
| 所有 fetcher 降级 | assemble 仍返回结果（仅 warnings） | ✅ 已补充（`layer-degrade-warning.test.ts` 新增全层降级场景）     |
| API Key 缺失      | `AI_PROVIDER_UNAVAILABLE`          | ⚠️ 仍待统一（当前实现返回 `AI_NOT_CONFIGURED`）                   |
| LLM provider 超时 | `SKILL_TIMEOUT` + done event       | ✅ 已补充（`ai-stream-lifecycle.test.ts` 新增 timeout done 场景） |

### 2.4 其他待验

- [ ] `ChatMessage`（chatMessageManager）vs `ChatHistoryMessage`（ipc/ai.ts）类型一致性
- [ ] Preload allowedChannels 是否包含 P1 新增通道
- [ ] `aiStreamBridge` 是否处理 `AiQueueStatusEvent` 类型
- [ ] `KgRulesInjectionEntity`（shared）vs `KnowledgeEntity`（kgService）转换是否完整

---

## 三、真实 LLM 集成测试（DeepSeek）

> 目的：不止 mock，用真实 LLM 调用验证端到端链路的实际效果。

### 3.1 环境配置

在 `apps/desktop/.env`（从 `.env.example` 复制）中配置 DeepSeek：

```env
CREONOW_AI_PROVIDER=openai
CREONOW_AI_BASE_URL=https://api.deepseek.com
CREONOW_AI_API_KEY=sk-<your-deepseek-key>
CREONOW_AI_TIMEOUT_MS=60000
```

DeepSeek 兼容 OpenAI `/v1/chat/completions` 接口，provider 设为 `openai` 即可。

### 3.2 测试场景与灵活性

Agent 执行真实 LLM 集成测试时，有以下灵活度：

**响应方式**：

- 优先尝试 **streaming**（`stream: true`）—— 验证 `skill:stream:chunk` / `skill:stream:done` 完整链路
- 若 streaming 不稳定，可退回 **non-streaming**（`stream: false`）—— 验证单次完整响应
- 若 chat completions 端点异常，可尝试调整请求参数（如 `temperature`、`max_tokens`），不必严格固定

**调用路径**：

- 优先走 `ai:skill:run` IPC 全链路（skillExecutor → context assembly → aiService → LLM）
- 若 IPC 层有阻碍，可直接调用 `aiService.runSkill()` 或更底层的 HTTP fetch 验证连通性
- 目标是确认**真实 LLM 能返回有意义的文本**，而非严格断言输出内容

**模型选择**：

- 推荐 `deepseek-chat`（成本低、速度快）
- 如需更强能力可用 `deepseek-reasoner`

### 3.3 验证检查清单

| #   | 验证项                 | 方法                                                            |
| --- | ---------------------- | --------------------------------------------------------------- |
| L1  | API 连通性             | 发送最简请求，确认返回 200 + 非空 content                       |
| L2  | Streaming 链路         | `stream: true`，确认收到多个 chunk + done 事件                  |
| L3  | Context 注入可见性     | 在 KG 中创建实体，触发 skill:run，检查 LLM 输出是否体现实体信息 |
| L4  | 超时处理               | 设置极短 timeout（如 1ms），确认返回 SKILL_TIMEOUT              |
| L5  | Non-streaming fallback | `stream: false`，确认返回完整 outputText                        |

### 3.4 安全约束

- `.env` 文件已在 `.gitignore` 中，API key 不会提交
- 真实 LLM 测试仅在本地开发环境执行，CI 必须继续使用 mock
- 每次测试控制 `max_tokens`（建议 ≤ 200）以限制费用

---

## 四、缺失的集成测试（需补充）

| #   | 场景                                                       | 涉及模块                  | 优先级   |
| --- | ---------------------------------------------------------- | ------------------------- | -------- |
| G1  | 完整 skill:run → context assemble → LLM mock → stream 返回 | AI + Context + KG + Skill | **HIGH** |
| G5  | 全降级：KG 不可用 + Memory 不可用 → AI 仍可用              | All                       | **HIGH** |
| G2  | KG 实体变更 → rules/retrieved fetcher 输出变更             | KG + Context              | MEDIUM   |
| G3  | API Key 保存 → 读取 → LLM 调用成功                         | Workbench + AI            | MEDIUM   |
| G4  | 多轮对话：message add → build → trim → 第 N 轮             | AI + aiStore              | MEDIUM   |

---

## 五、cross-module-integration-spec.md Delta Report

| Spec Scenario                                | 状态            |
| -------------------------------------------- | --------------- |
| 选区改写被接受后写入情景记忆 (Editor→Memory) | 未实现（P3/P4） |
| 应用后撤销触发延迟负反馈 (Editor→Memory)     | 未实现（P4）    |
| Context Engine 注入实体到 Rules 层 (KG→CE)   | ✅ 已实现       |
| KG 不可用时 Context Engine 降级 (KG→CE)      | ✅ 已实现       |
| AI Service 选择技能并流式返回 (AI→Skill)     | ✅ 已实现       |
| 技能超时触发统一错误 (AI→Skill)              | ✅ 已实现       |
| 契约校验通过并生成代码 (IPC)                 | 部分实现        |
| 跨模块越权访问被拒绝 (NFR)                   | 部分实现        |
| 契约冲突触发阻断 / 高并发链路一致 (NFR)      | 未验证          |

---

## 六、执行优先级总览

| 优先级 | 项                                                                                        |
| ------ | ----------------------------------------------------------------------------------------- |
| HIGH   | 统一 API Key 缺失语义：文档期望 `AI_PROVIDER_UNAVAILABLE`，当前实现为 `AI_NOT_CONFIGURED` |
| HIGH   | 评估 `buildLLMMessages` 与 `chatMessageManager` 死路径清理（接入或移除）                  |
| MEDIUM | §3 真实 LLM 测试（DeepSeek）L1-L5 自动化沉淀（当前以手工验证为主）                        |
| MEDIUM | 持续对齐 §2.2 IPC 契约 delta 与 §2.4 类型一致性核查                                       |
