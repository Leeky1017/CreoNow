# P1 架构提炼：CC 源码模式 → CN 适配方案

> 本文档从 Claude Code (CC) 源码中提炼所有 P1 阶段相关的架构设计思路，对照 CreoNow (CN) 的适配方案。

---

## 1. 编排层模式（Orchestration Pattern）

### CC 原始实现：QueryEngine.ts (502 行)

```
特征：
- 有状态类（class），非函数组合
- 构造函数注入配置（DI）
- execute() 返回 AsyncGenerator<Event>，事件驱动
- 内部管线：parse intent → assemble context → select model → call LLM → stream response → handle tools → commit result
- 生命周期管理：init / running / done / error / cancelled
- AbortController 多级取消链
```

### CN 适配方案：WritingOrchestrator

| 维度 | CC QueryEngine | CN WritingOrchestrator |
|------|---------------|----------------------|
| 类型 | 有状态类 | 有状态类（沿用） |
| 入口 | `execute(query)` | `execute(request): AsyncGenerator<WritingEvent>` |
| 管线步骤 | parse → context → model → stream → tools → commit | intent → context → model → stream → confirm → write → snapshot |
| 事件类型 | QueryEvent | WritingEvent（streaming/confirm/write/snapshot/error） |
| 取消机制 | AbortController | AbortController（Session → Request → Skill 三级） |
| Tool-use | 每轮循环解析 tool_use | V1 不实现 tool-use 循环，预留接口 |
| 状态管理 | 内部状态机 | 显式状态机 pending/running/paused/completed/failed/killed |

**关键决策**：
- 沿用 CC 的有状态类设计，因为写作编排需要管理跨步骤的状态（当前文档、执行历史、快照 ID）
- 使用 AsyncGenerator 而非 Promise，支持流式事件推送
- V1 不实现 tool-use 循环（P2 再加），简化管线为直通式

---

## 2. Tool 注册表模式（Tool Registry Pattern）

### CC 原始实现：Tool.ts (760 行)

```
特征：
- Tool 接口定义：name, description, inputSchema, execute()
- buildTool() 工厂函数：标准化创建流程
- isConcurrencySafe: boolean 标记，默认 false（fail-closed 原则）
- ToolUseResult 结构化返回
- ToolError 标准错误类型
```

### CN 适配方案：WritingTool

| 维度 | CC Tool | CN WritingTool |
|------|---------|---------------|
| 接口 | `Tool { name, description, inputSchema, execute() }` | `WritingTool { name, description, isConcurrencySafe, execute() }` |
| 工厂 | `buildTool(config)` | `buildWritingTool(config)`（沿用工厂模式） |
| 并发安全 | `isConcurrencySafe: boolean` | 沿用，默认 false |
| V1 工具集 | 20+ 工具 | 3 个：documentRead, documentWrite, versionSnapshot |

**关键决策**：
- `isConcurrencySafe` 默认 false 是精妙设计——新增 Tool 必须显式声明安全性，否则串行执行，避免并发 bug
- V1 只注册最小工具集，但注册表设计支持后续扩展

---

## 3. 流式处理模式（Streaming Pattern）

### CC 原始实现：query.ts (600+ 行)

```
特征：
- SSE chunk 逐步解析
- tool_use 消息类型检测
- streaming 文本追加
- AbortController 中断链路
- 错误三元组：retryable / non-retryable / partial-result
- 超时处理：请求级 + 全局级
```

### CN 适配方案：V1 简化版 Streaming

| 维度 | CC Streaming | CN V1 Streaming |
|------|-------------|----------------|
| SSE 解析 | 完整 tool_use + text | V1 仅解析 text，tool_use 预留 |
| 回传路径 | CLI stdout | IPC Push → Renderer |
| 错误恢复 | 重试 + 断点续传 | 重试（全量重试，不做断点续传） |
| 取消 | AbortController | AbortController（沿用） |
| 超时 | 请求级 + 全局级 | V1 仅请求级超时 |

**关键决策**：
- 沿用 CC 的 SSE chunk 解析模式，但 V1 不处理 tool_use 消息
- 错误分类沿用三元组但 V1 只实现 retryable（重试 3 次）和 non-retryable（直接报错）
- partial-result 场景：流式中断后保留已接收内容，不丢弃

---

## 4. 原稿保护模式（Manuscript Protection Pattern）

### CC 原始实现：fileHistory.ts

```
特征：
- 快照创建时机：每次修改前自动快照
- diff patch 恢复：通过 diff 计算变更，可逆向恢复
- 三阶段提交：snapshot → write → confirm
- 不可变快照：创建后不可修改
```

### CN 适配方案：线性快照 + 三阶段提交

| 维度 | CC fileHistory | CN V1 版本控制 |
|------|---------------|---------------|
| 模型 | 文件级快照 + diff patch | 线性快照链表 |
| 内容格式 | 文本文件 | ProseMirror State JSON |
| 提交流程 | snapshot → write → confirm/revert | pre-write → AI write → user confirm/reject |
| 分支 | 无 | 无（V1 线性，V3+ 考虑分支） |
| 恢复方式 | diff patch 逆向 | 直接加载目标快照内容 |

**关键决策**：
- CC 使用 diff patch 恢复（增量），CN V1 使用全量快照恢复（简单但占空间更多）
- V1 的三阶段提交比 CC 更严格：用户**必须**确认才能最终写入
- 快照 reason 枚举扩展了 CC 没有的 `pre-write`（AI 写入前的安全快照）

---

## 5. Permission Gate 模式

### CC 原始实现

```
特征：
- 分级权限：allow / ask / deny
- 规则持久化
- 拒绝追踪
```

### CN 适配方案：四级权限

| CC 级别 | CN 级别 | 适用场景 |
|---------|---------|---------|
| `allow` | `auto-allow` | 只读操作（查文档、查 KG） |
| `ask` (低风险) | `preview-confirm` | 追加内容（续写） |
| `ask` (高风险) | `must-confirm-snapshot` | 替换内容（改写、润色） |
| `deny` + 提示 | `budget-confirm` | 高成本操作（长文生成） |

**关键决策**：
- CN 比 CC 细分了一个 `must-confirm-snapshot` 级别，强调原稿保护
- `budget-confirm` 是 CN 独有的，因为写作场景 token 消耗远大于代码场景

---

## 6. 并发分区模式（Concurrency Partition）

### CC 原始实现

```
特征：
- isConcurrencySafe 声明式标记
- 贪心合并：连续 safe=true 的步骤合并为并行 batch
- safe=false 的步骤强制等待前序完成
- 批次大小无上限（由 provider 的并发能力决定）
```

### CN 适配方案

| 维度 | CC | CN V1 |
|------|-----|-------|
| 标记位置 | Tool 级 | Tool + Step 级 |
| 合并策略 | 贪心合并 | V1 简化为全串行（V2 启用贪心合并） |
| 读写分离 | 隐式（通过标记） | 显式（读 safe=true，写 safe=false） |

**V1 简化原因**：P1 阶段技能执行是单次 LLM 调用，不存在多步骤并发场景。标记系统建立但并发合并在 V2 启用。

---

## 7. 中文 Token 估算模式

### CC 原始实现

```typescript
// CC 默认假设
const UTF8_BYTES_PER_TOKEN = 4;
function estimateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / UTF8_BYTES_PER_TOKEN);
}
```

### CN 适配方案

```typescript
// CN 中文感知估算
function estimateTokens(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/gu) || []).length;
  const nonCjkBytes = bytes - cjkChars * 3;
  return Math.ceil(cjkChars * 1.5 + nonCjkBytes / 4);
}
```

| 输入 | CC 估算 | CN 估算 | tiktoken 实际 |
|------|---------|---------|-------------|
| "你好世界" (12 bytes) | 3 | 6 | ~6 |
| "Hello World" (11 bytes) | 3 | 3 | ~2 |
| "林远走进了咖啡店" (24 bytes) | 6 | 12 | ~10-12 |

**关键决策**：CJK 字符按 1.5 tokens/char 估算偏保守，确保不会因低估导致上下文溢出。

---

## 8. 任务状态机模式

### CC 原始实现：Task.ts

```
特征：
- 状态：pending / running / completed / failed / killed
- generateTaskId()：唯一 ID 生成
- isTerminalTaskStatus()：终态判断辅助函数
```

### CN 适配方案

| CC 状态 | CN 状态 | 差异 |
|---------|---------|------|
| pending | pending | 相同 |
| running | running | 相同 |
| — | **paused** | CN 新增：用户暂停生成 |
| completed | completed | 相同 |
| failed | failed | 相同 |
| killed | killed | 相同：外部强制终止 |

**新增 `paused` 的原因**：写作场景中用户可能暂停 AI 生成去思考，然后继续，这在代码场景中不常见。

---

## 9. Post-Writing Hooks 模式

### CC 原始实现

CC 的 post-sampling hooks 是隐式的，散布在 query.ts 的各个回调中。

### CN 适配方案：显式 Hook 链

```typescript
const postWritingHooks: PostWritingHook[] = [
  { name: 'auto-save-version', priority: 10, condition: hasDocumentChanges, enabled: true },
  { name: 'update-kg',         priority: 20, condition: mentionsEntities,   enabled: false }, // V1 不启用
  { name: 'extract-memories',  priority: 30, condition: isSessionEnd,       enabled: false }, // V1 不启用
  { name: 'quality-check',     priority: 40, condition: wordCountAbove500,  enabled: false }, // V1 不启用
];
```

**关键决策**：
- 将 CC 隐式的 post-sampling 行为提取为显式 Hook 链，便于测试和扩展
- V1 只启用 `auto-save-version`，其他 Hook 注册但 `enabled: false`
- Hook 按 priority 顺序执行，失败一个不阻塞后续

---

## 10. 关键数据结构对照表

| 数据结构 | CC 定义 | CN P1 定义 | 差异说明 |
|---------|---------|-----------|---------|
| 请求对象 | `Query { text, context }` | `WritingRequest { skillId, documentId, selectedText?, instruction? }` | CN 绑定文档和技能 |
| 事件流 | `QueryEvent { type, data }` | `WritingEvent: Tagged Union { type: string; timestamp: number; ...variant-specific fields }`（见 skill-system/spec.md 完整定义） | CN 加时间戳用于审计，采用 Tagged Union 而非 `{ type, payload }` 结构 |
| 工具定义 | `Tool { name, execute, inputSchema }` | `WritingTool { name, execute, isConcurrencySafe }` | CN 去掉 inputSchema（V1 工具固定） |
| 上下文 | `Context { messages, systemPrompt }` | `WritingContext { layers, budget, stablePrefixHash }` | CN 四层结构（V1 只用两层） |
| 结果 | `QueryResult { content, usage }` | `WritingResult { output, metadata, snapshotId }` | CN 绑定快照 ID |
| 快照 | `FileHistoryEntry { path, content }` | `LinearSnapshot { id, documentId, content, actor, reason }` | CN 线性链表 + actor 标记 |
| 权限 | `Permission { level, rule }` | `PermissionGate { level, requiredActions }` | CN 四级（vs CC 三级） |
| 状态 | `Task { status }` | `WritingTask { status, +paused }` | CN 多一个 paused 状态 |

---

## 附录：CC 源文件参考索引

| CN P1 子任务 | CC 参考文件 | 提取要点 |
|-------------|------------|---------|
| 编排层 | `QueryEngine.ts` (502 行) | 有状态类、生命周期管理、配置注入 |
| Tool 注册表 | `Tool.ts` (760 行) | Tool 接口、buildTool() 工厂、isConcurrencySafe |
| AI 主链路 | `query.ts` (600+ 行) | streaming 处理、错误恢复 |
| 原稿保护 | `fileHistory.ts` | 快照创建时机、diff patch 恢复 |
| 并发分区 | `toolOrchestration.ts` | 贪心合并、safe 标记 |
| 成本追踪 | `cost-tracker.ts` | per-model 追踪（V1 预留） |
| 中文 Token | CC `estimateTokens` | UTF8_BYTES_PER_TOKEN=4 修正 |
| 任务状态机 | `Task.ts` | 状态枚举、终态判断 |
