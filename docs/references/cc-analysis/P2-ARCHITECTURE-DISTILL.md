# P2 Architecture Distill — CC 到 CN 的模式映射

> **阶段**: P2（端到端闭环）
> **用途**: 记录 CC（Claude Code）中提取的架构模式如何映射到 CN（CreoNow）的 P2 实现。供实现 Agent 在编码前阅读，理解设计意图和取舍。

---

## 1. autoCompact → Narrative-Aware Context Compression

### CC 原始模式

**文件**: `services/autoCompact.ts` + `services/microcompact.ts` + `services/compactMessageHistory.ts`

CC 的 autoCompact 是面向代码对话的通用压缩：

- **触发时机**: 对话 token 数超过上下文窗口的一定比例时自动触发
- **压缩方式**: 将旧消息对折叠为摘要，使用 `NO_TOOLS_PREAMBLE` 级别的 LLM 调用
- **microcompact**: 对单条消息做段内缩减，去除冗余的 XML 标签、重复的工具输出
- **compactMessageHistory**: 合并连续的 user+assistant 对话对为摘要条目
- **熔断机制**: CC 没有显式的 circuit breaker，但通过重试次数限制隐式实现

### CN 适配（改了什么）

| CC 特性 | CN 改造 | 原因 |
|---------|---------|------|
| 通用文本摘要 | **叙事感知摘要** | 代码上下文可以丢弃旧 diff，但小说不能丢弃角色名 |
| NO_TOOLS_PREAMBLE | **NARRATIVE_SUMMARY_PROMPT** | 专用提示词，强制保留角色/情节/伏笔/时间线 |
| 隐式重试限制 | **显式 circuit breaker（3 次失败 → 熔断）** | 创作者对延迟更敏感，需要快速降级 |
| 单层压缩 | **三层压缩（history-compaction → micro-compression → narrative-summarization）** | 先低成本操作，LLM 调用作为最后手段 |
| 无叙事元素抽取 | **NarrativeElements 接口** | 压缩结果必须附带保留元素清单，供审计验证 |

### 关键设计决策

1. **微压缩不使用 LLM**: CC 的 microcompact 也是基于规则的，CN 沿用此策略——基于规则的去冗余速度快、无额外成本
2. **87% 阈值**: 复用 P1 context-engine 的容量警戒阈值，与 CC 的触发比例对齐
3. **compressed-history 层**: CC 没有分层概念，CN 将压缩后的历史作为独立层参与组装。`stablePrefixHash` 仍仅基于 Rules 层内容（不包含 compressed-history），避免压缩结果变化导致缓存失效

---

## 2. cost-tracker → CostTracker

### CC 原始模式

**文件**: `cost-tracker.ts` + `costHook.ts`

CC 的费用追踪：

- **ModelPricingTable**: 硬编码的模型定价表，包含 input/output/cached per-token 价格
- **recordUsage()**: 从 API 返回的 usage 信息计算费用
- **会话累计**: 跟踪单次 CLI 会话的累计费用
- **costHook**: 作为 post-tool-use hook 在每次 API 调用后执行
- **无预算控制**: CC 没有 budget alerts 或 hard-stop 机制

### CN 适配（改了什么）

| CC 特性 | CN 改造 | 原因 |
|---------|---------|------|
| 硬编码定价 | **可配置 ModelPricingTable** | CN 用户可能使用各种模型和 API 端点 |
| 无预算控制 | **BudgetPolicy（warning + hard-stop）** | 创作者用户（非开发者）需要费用保护 |
| CLI hook | **PostWritingHook 集成** | CN 使用 WritingOrchestrator 管线，非 CLI hook |
| 无 CJK 考虑 | **CJK token 系数** | 中文输入的 token 密度与英文不同，费用预估需调整 |
| 无 IPC 暴露 | **cost:* IPC 通道** | Electron 架构需要 Main → Renderer 费用数据通道 |

### 关键设计决策

1. **不持久化**: P2 费用仅跟踪当前会话，简化实现——历史费用分析留给 P3
2. **estimateCost() 预估**: CC 没有费用预估，CN 新增此能力用于 `budget-confirm` 级别的权限确认
3. **Priority 5**: `cost-tracking` Hook 优先于 `auto-save-version`（Priority 10），确保预算告警检查在任何可能失败的 Hook 之前完成

---

## 3. toolOrchestration → Agentic Loop

### CC 原始模式

**文件**: `services/tools/toolOrchestration.ts` + `query.ts`

CC 的 tool-use 循环：

- **并发分区**: `isConcurrencySafe` 标记 → 安全工具并行执行，不安全工具串行
- **parseToolCalls**: 从 API 响应中解析 tool_use blocks
- **executeToolBatch**: 按分区策略批量执行
- **injectResults**: 将结果作为 tool role 消息注入
- **max rounds**: 通过配置限制最大循环次数
- **query.ts 主循环**: `while (finishReason === 'tool_use') { parse → execute → inject → call-ai }`

### CN 适配（改了什么）

| CC 特性 | CN 改造 | 原因 |
|---------|---------|------|
| 通用 tool 系统 | **写作专用 tools（kgTool, memTool, docTool）** | CN 的 tool 面向创作场景 |
| 所有请求可 tool-use | **per-Skill 配置 agenticLoop** | 润色不需要查 KG，只有续写需要 |
| tool 可修改文件 | **tool 只读** | CN 的文档写入必须走建议 → 用户确认流程 |
| 无降级路径 | **tool 数据不可用时返回空而非错误** | P2 的 KG/Memory 尚未完整实现 |
| CLI 交互 | **WritingOrchestrator 管线阶段** | CN 使用管线架构 |

### 关键设计决策

1. **P2 仅 `continue` 启用**: 减少复杂度——润色和改写不需要查询上下文，只有续写场景受益于自动工具调用
2. **tool_use → 忽略**: 未启用 agenticLoop 的 Skill，即使 AI 返回 tool_use 也不执行，防止意外行为
3. **空结果 ≠ 错误**: `kgTool` 和 `memTool` 在底层模块未就绪时返回空结果而非抛错，确保 AI 生成不被阻塞

---

## 4. Diff Preview Engine — CN 独有设计

### CC 对标

**无**。Claude Code 是 CLI 工具，没有编辑器 UI，因此没有 inline diff preview 的概念。CC 的变更通过 `unified diff` 文本格式展示，用户通过 `y/n` 确认。

### CN 设计来源

Diff Preview Engine 的设计灵感来自：

- **VS Code Source Control**: inline change decorations（绿色行 = 新增，红色行 = 删除）
- **GitHub PR Review**: per-line accept/reject 的交互模型
- **ProseMirror 装饰系统**: Decoration.inline() + Decoration.widget() 的能力

### CN 独有设计决策

| 决策 | 理由 |
|------|------|
| ProseMirror Decoration 而非独立 diff 面板 | 创作者需要在写作上下文中看到变更，切换面板打断心流 |
| 逐条 accept/reject 粒度 | 润色可能改动 10 处，用户可能只想接受 7 处 |
| Step 级别精确回放 | ProseMirror Step 是最小原子操作，确保 accept/reject 不破坏文档结构 |
| 快照回滚而非 Undo 栈 | Undo 栈在复杂多步操作后不可靠，快照提供确定性回滚 |
| 建议模式下拦截编辑 | 防止用户在 diff 未处理时编辑导致位置错乱 |
| 降级到 P1 面板方案 | 块级结构变更（如段落 → 列表）无法精确 Step 化时的安全网 |

### P2 → P3 演进方向（仅供参考，P2 不实现）

- 流式 diff（AI 生成过程中实时更新装饰）
- 多候选 diff（生成多个版本供选择）
- 跨文档批量 diff（重构场景）

---

## 跨模块集成图

```
用户触发 Skill
  │
  ▼
WritingOrchestrator
  ├─ validate-input
  ├─ assemble-context ──→ [P2] CompressionEngine（87% 触发压缩）
  │                              └─ compressed-history 层
  ├─ select-model
  ├─ [P2] CostTracker.checkBudget()（预算检查，超限则中止）
  ├─ call-ai
  ├─ stream-response
  ├─ [P2] tool-use-loop ──→ ToolUseHandler
  │       │                    ├─ parseToolCalls
  │       │                    ├─ executeToolBatch（并发分区）
  │       │                    │    ├─ kgTool（并行）
  │       │                    │    ├─ memTool（并行）
  │       │                    │    └─ docTool（并行）
  │       │                    ├─ [P2] CostTracker.recordUsage(本轮 usage) → checkBudget()
  │       │                    └─ injectResults → 循环 call-ai
  │       └─ finishReason === 'stop' → 退出循环
  ├─ ai-done
  │       └─ [P2] CostTracker.recordUsage()（确保任何退出路径都记录费用）
  ├─ [P2] diff-preview ──→ DiffEngine
  │       └─ createSuggestionTransaction → 编辑器 inline 装饰
  ├─ permission-gate
  │       └─ 用户逐条 accept/reject 或 acceptAll/rejectAll
  ├─ write-back
  ├─ version-snapshot
  └─ post-hooks
        ├─ [P2] cost-tracking ──→ 检查预算告警 + 触发通知
        └─ auto-save-version
```
