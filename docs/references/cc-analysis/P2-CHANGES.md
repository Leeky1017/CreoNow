# P2 File-Level Change List

> **阶段**: P2（端到端闭环）
> **用途**: 为工程 Agent 提供精确的文件级实现清单。每个条目对应一个要创建或修改的源文件。

---

## Spec 文件变更（已完成）

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `openspec/specs/editor/spec.md` | MODIFIED | 新增 `## P2: Diff Preview Engine` 章节 |
| `openspec/specs/skill-system/spec.md` | MODIFIED | 新增 `## P2: Agentic Loop` 章节 |
| `openspec/specs/context-engine/spec.md` | MODIFIED | 新增 `## P2: Narrative-Aware Context Compression` 章节 |
| `openspec/specs/ai-service/spec.md` | MODIFIED | 新增 `## P2: Cost Tracker` 章节 |
| `openspec/specs/version-control/spec.md` | MODIFIED | 新增 `ai-partial-accept` SnapshotReason 值（P2 Diff Preview 部分接受触发） |
| `docs/references/cc-analysis/P2-ARCHITECTURE-DISTILL.md` | NEW | CC → CN 模式映射文档 |
| `docs/references/cc-analysis/P2-CHANGES.md` | NEW | 本文件 |

---

## 2A. Diff Preview Engine — 实现文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `apps/desktop/renderer/src/services/editor/diff/DiffEngine.ts` | DiffEngine 核心实现（createSuggestionTransaction, acceptChange, rejectChange, acceptAll, rejectAll） |
| `apps/desktop/renderer/src/services/editor/diff/SuggestionPlugin.ts` | ProseMirror Plugin——管理装饰状态、拦截编辑、导航 |
| `apps/desktop/renderer/src/services/editor/diff/types.ts` | DiffChange, SuggestionDecoration, DiffResult, DiffStats 类型定义 |
| `apps/desktop/renderer/src/services/editor/diff/errors.ts` | DiffError 类 + 错误码常量 |
| `apps/desktop/renderer/src/services/editor/diff/diff-algorithm.ts` | 文本 diff 算法（计算最小变更集） |
| `apps/desktop/renderer/src/services/editor/diff/index.ts` | barrel export |

### 修改文件

| 文件路径 | 修改点 |
|---------|--------|
| `apps/desktop/renderer/src/services/editor/EditorBridge.ts` | 新增 `enterSuggestionMode()` / `exitSuggestionMode()` 方法 |
| `apps/desktop/renderer/src/services/editor/schema/` | SuggestionMark CSS class 定义 |
| `apps/desktop/main/src/services/skills/orchestrator.ts` | 新增 diff IPC 通道处理（`diff:create-suggestions`、`diff:ready` 等） |
| `apps/desktop/main/src/services/version/linearSnapshotStore.ts` | SnapshotReason union 新增 `'ai-partial-accept'` |

### 测试文件

| 文件路径 | 覆盖场景 |
|---------|---------|
| `apps/desktop/renderer/src/services/editor/diff/__tests__/DiffEngine.test.ts` | createSuggestionTransaction / acceptChange / rejectChange / acceptAll / rejectAll |
| `apps/desktop/renderer/src/services/editor/diff/__tests__/SuggestionPlugin.test.ts` | 装饰渲染 / 编辑拦截 / 导航 |
| `apps/desktop/renderer/src/services/editor/diff/__tests__/diff-algorithm.test.ts` | diff 算法边界case（空文本、全替换、CJK 文本） |

> **注意**：DiffEngine 运行在 Renderer 进程（与 ProseMirror EditorView 同进程）。WritingOrchestrator（Main 进程）通过 `diff:*` IPC 通道与之交互。详见 `editor/spec.md` P2 Diff IPC 通道定义。

---

## 2B. Agentic Loop — 实现文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `apps/desktop/main/src/services/skills/agentic/ToolUseHandler.ts` | ToolUseHandler 实现（parseToolCalls, executeToolBatch, injectResults） |
| `apps/desktop/main/src/services/skills/agentic/concurrency.ts` | 并发分区逻辑（partitionByConcurrency） |
| `apps/desktop/main/src/services/skills/agentic/types.ts` | ParsedToolCall, ToolCallResult, ToolUseConfig 等类型 |
| `apps/desktop/main/src/services/skills/agentic/errors.ts` | ToolUseError 类 + 错误码 |
| `apps/desktop/main/src/services/skills/agentic/index.ts` | barrel export |
| `apps/desktop/main/src/services/skills/tools/kgTool.ts` | 知识图谱查询 tool |
| `apps/desktop/main/src/services/skills/tools/memTool.ts` | 记忆查询 tool |
| `apps/desktop/main/src/services/skills/tools/docTool.ts` | 文档检索 tool |

### 修改文件

| 文件路径 | 修改点 |
|---------|--------|
| `apps/desktop/main/src/services/skills/orchestrator.ts` | 在 stream-response 后插入 tool-use-loop 阶段 |
| `apps/desktop/main/src/services/skills/toolRegistry.ts` | 注册 kgTool / memTool / docTool |
| `apps/desktop/main/src/services/skills/types.ts` | PipelineConfig.agenticLoop, ToolUseConfig, 新增 WritingEvent 类型 |

### 测试文件

| 文件路径 | 覆盖场景 |
|---------|---------|
| `apps/desktop/main/src/services/skills/agentic/__tests__/ToolUseHandler.test.ts` | 解析/执行/注入全流程 |
| `apps/desktop/main/src/services/skills/agentic/__tests__/concurrency.test.ts` | 并发分区、并行/串行执行 |
| `apps/desktop/main/src/services/skills/tools/__tests__/kgTool.test.ts` | KG 查询 + 降级空结果 |
| `apps/desktop/main/src/services/skills/tools/__tests__/memTool.test.ts` | Memory 查询 + 降级空结果 |
| `apps/desktop/main/src/services/skills/tools/__tests__/docTool.test.ts` | 文档检索 |

---

## 2C. Narrative-Aware Context Compression — 实现文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `apps/desktop/main/src/services/context/compression/CompressionEngine.ts` | 三层压缩引擎实现 |
| `apps/desktop/main/src/services/context/compression/history-compaction.ts` | 第一层：对话历史压缩 |
| `apps/desktop/main/src/services/context/compression/micro-compression.ts` | 第二层：基于规则的微压缩 |
| `apps/desktop/main/src/services/context/compression/narrative-summarization.ts` | 第三层：LLM 叙事摘要 |
| `apps/desktop/main/src/services/context/compression/circuit-breaker.ts` | 熔断器实现 |
| `apps/desktop/main/src/services/context/compression/narrative-elements.ts` | 叙事元素抽取与验证 |
| `apps/desktop/main/src/services/context/compression/types.ts` | CompressionRequest, CompressionResult 等类型 |
| `apps/desktop/main/src/services/context/compression/errors.ts` | CompressionError + 错误码 |
| `apps/desktop/main/src/services/context/compression/index.ts` | barrel export |

### 修改文件

| 文件路径 | 修改点 |
|---------|--------|
| `apps/desktop/main/src/services/context/tokenEstimation.ts` | 复用，无修改（P1 已实现） |
| `apps/desktop/main/src/services/context/types.ts` | P2ContextAssembleResult, CompressionLayer 等类型 |

### 测试文件

| 文件路径 | 覆盖场景 |
|---------|---------|
| `apps/desktop/main/src/services/context/compression/__tests__/CompressionEngine.test.ts` | 三层压缩 + 触发条件 + 统计 |
| `apps/desktop/main/src/services/context/compression/__tests__/history-compaction.test.ts` | 对话合并 + keepRecentRounds |
| `apps/desktop/main/src/services/context/compression/__tests__/micro-compression.test.ts` | 去冗余 + 专有名词保留 |
| `apps/desktop/main/src/services/context/compression/__tests__/narrative-summarization.test.ts` | LLM 摘要 + 叙事元素保留 |
| `apps/desktop/main/src/services/context/compression/__tests__/circuit-breaker.test.ts` | 3 次失败熔断 + 冷却 + 半开 |

---

## 2D. Cost Tracker — 实现文件清单

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `apps/desktop/main/src/services/ai/cost/CostTracker.ts` | 费用追踪核心实现 |
| `apps/desktop/main/src/services/ai/cost/pricing-table.ts` | 默认模型定价表 |
| `apps/desktop/main/src/services/ai/cost/budget-policy.ts` | 预算策略管理 |
| `apps/desktop/main/src/services/ai/cost/types.ts` | ModelPricing, RequestCost, SessionCostSummary, BudgetPolicy 等类型 |
| `apps/desktop/main/src/services/ai/cost/errors.ts` | CostTrackerError + 错误码 |
| `apps/desktop/main/src/services/ai/cost/index.ts` | barrel export |
| `apps/desktop/main/src/services/ai/cost/cost-tracking-hook.ts` | PostWritingHook 实现 |

### 修改文件

| 文件路径 | 修改点 |
|---------|--------|
| `apps/desktop/main/src/services/ai/types.ts` | CostRecordedEvent 事件类型 |
| `apps/desktop/main/src/services/skills/orchestrator.ts` | 注册 cost-tracking Hook + ai-done 阶段调用 recordUsage |
| `apps/desktop/main/src/ipc/` | 新增 cost:* IPC 通道处理 |

### 测试文件

| 文件路径 | 覆盖场景 |
|---------|---------|
| `apps/desktop/main/src/services/ai/cost/__tests__/CostTracker.test.ts` | recordUsage / getSessionCost / checkBudget / estimateCost |
| `apps/desktop/main/src/services/ai/cost/__tests__/pricing-table.test.ts` | 定价查询 + 模型未找到 |
| `apps/desktop/main/src/services/ai/cost/__tests__/budget-policy.test.ts` | warning + hard-stop + 阈值边界 |
| `apps/desktop/main/src/services/ai/cost/__tests__/cost-tracking-hook.test.ts` | Hook 执行 + 失败降级 |

---

## 实现优先级建议

```
2D  Cost Tracker         ← 最简单，无外部依赖，可先实现以验证 PostWritingHook 管线
2B  Agentic Loop         ← 依赖 ToolRegistry（P1 已有），但需要仔细处理管线扩展
2C  Context Compression  ← 依赖 LLM 调用（第三层），需要 mock 测试
2A  Diff Preview Engine  ← 最复杂，依赖 ProseMirror 深度集成，建议最后实现
```

> 建议实现顺序：**2D → 2B → 2C → 2A**（Cost Tracker → Agentic Loop → Compression → Diff Preview，从简到复杂）。先完成 Cost Tracker 端到端验证管线集成，再逐步增加复杂度。

---

## P2 不实现的文件（明确排除）

以下模块在 P2 scope 中明确不实现：

- `apps/desktop/main/src/services/version/branch/` — 分支版本管理
- `apps/desktop/renderer/src/services/editor/outline/drag-drop/` — 大纲拖拽
- `apps/desktop/main/src/services/ai/candidates/` — 多候选生成
- `apps/desktop/main/src/services/skills/custom/` — 自定义技能开发
- `apps/desktop/renderer/src/services/workbench/theme/` — 主题切换
- `apps/desktop/main/src/services/ai/coordinator/` — Coordinator/蜂群模式
