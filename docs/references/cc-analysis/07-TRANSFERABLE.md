# 07 — CC→CN 能力迁移完整评估：最终版

> 逐项判定：哪些能直接搬、哪些必须改造、哪些不需要。
> 本章合并了多轮纠正后的最终结论。

---

## 优先级定义

| 级别 | 含义 |
|------|------|
| P0 | **必须做** — 不做会有用户体验硬伤或基础缺陷 |
| P1 | **应该做** — 显著提升产品竞争力或开发效率 |
| P2 | **值得做** — 中期提升，有成熟参考可搬 |
| P3 | **可以参考** — 长期演进方向，暂不紧迫 |

---

## 一、CC 能力完整判定矩阵

| CC 能力 | 判定 | 优先级 | 理由 |
|---------|------|--------|------|
| **Permission 系统** | ✅ 简化版搬 | **P0** | 保护用户原稿是创作工具的生命线 |
| **AutoCompact** | ⚠️ 搬框架，定制策略 | **P0** | CN 必须有，但压缩策略需叙事感知 |
| **Token Budget 中文修正** | 🔧 CN 自身修复 | **P0** | 4:1 估算对中文偏差 30-50%，基础准确性问题 |
| **LLM 替代关键词路由** | 🔧 CN 重构 | **P1** | CC 让 LLM 选工具的方式根本性更优 |
| **ToolSearch 延迟加载** | ⚠️ 搬思路 | **P1** | 节约 2000-5000 tokens 给创作上下文 |
| **Tool 并发标记 + `isConcurrencySafe` 分区** | ✅ 搬逻辑 | **P1** | 改作用层级从 Tool 到 Skill Step |
| **成本追踪** | ✅ 直接搬 | **P1** | 个人写作者对费用敏感 |
| **任务状态机** | ✅ 几乎完全搬 | **P1** | 加 `paused` 状态即可 |
| **Forked Agent** | ⚠️ 核心思路搬 | **P2** | 用于多候选续写 + Judge 的 cache 共享 |
| **AbortController 层级** | ✅ 直接搬 | **P2** | 三级取消控制 |
| **Coordinator 模式** | ⚠️ 搬架构，重写 prompt | **P2** | 从任务分解器变为写作流水线编排器 |
| **Skill 阶段白名单** | ✅ 直接搬，粒度更细 | **P2** | 从 agent 级变为 stage 级 |
| **MCP 接口设计** | 📐 参考协议设计 | **P2** | 为 CN 的 Skill Plugin Protocol 做参考 |
| **CLI 基座架构** | ⚠️ 搬模式 | **P2** | CommandDispatcher 统一入口 |
| **BashTool 安全模型** | 📐 知识储备 | **P3** | 未来本地工具集成时搬 |
| **Agent Swarm / Team** | 📐 长期参考 | **P3** | 多 Agent 并行写作 |
| **推测执行** | 📐 远期探索 | **P3** | 预测写作者下一步 |
| **Post-Sampling Hooks** | ✅ 框架搬 | **P1** | 适合挂载自动保存/KG更新/质量评估 |
| **会话恢复** | ⚠️ 搬模式 | **P2** | CN 用 SQLite 存更合适 |
| **启动并行优化** | ✅ 搬模式 | **P2** | DB/Embedding/FS 并行初始化 |
| **Unicode 安全清理** | ✅ 直接搬 | **P2** | 创意文本更容易含特殊字符 |

---

## 二、P0 项目详解

### 2.1 原稿保护系统（借鉴 CC Permission）

**为什么是 P0**：用户花三个月写的小说，AI 一次"续写"覆盖了原文没有回退方案，后果是灾难性的。这是创作工具产品的**生命线**。

**CC 做了什么**：
- 分级权限（`allow` / `ask` / `deny`）
- 规则持久化（"永远允许 critique skill 直接运行"）
- 上下文感知（不同项目不同权限）
- 拒绝追踪（记住用户偏好，避免重复打扰）
- 后台 Agent 无弹窗

**CN 需要的简化版**：

```
用户原稿 → AI 续写/改写 → [确认层] → 应用修改
                              ↑
                     ┌────────┴────────┐
                     │ Permission Gate │
                     │ 1. 修改前预览   │
                     │    (diff view)  │
                     │ 2. 一键撤销     │
                     │    (操作快照)   │
                     │ 3. 分级确认     │
                     │    只读→跳过    │
                     │    修改→确认    │
                     │ 4. 成本预估     │
                     │    "~2000 tok"  │
                     └─────────────────┘
```

Skill 分级对应关系：
| 操作类型 | CC 对应 | CN 行为 |
|----------|---------|--------|
| 总结/评析 | ReadOnly → auto allow | 无需确认 |
| 续写（追加） | Write → ask | 预览后确认 |
| 改写（替换） | Destructive → always ask | 必须确认 + 快照 |
| 长篇续写 | 高成本 → cost check | 预算确认 |

### 2.2 AutoCompact（叙事感知版）

**为什么是 P0**：创意写作的对话长度远超代码编辑。没有自动压缩，用户面临 context window 溢出。

**从 CC 搬的**：
- 阈值计算逻辑 + 三级预警
- Circuit breaker（连续失败 3 次停止）
- 查询来源过滤（压缩请求本身不触发压缩）

**CN 必须定制的**（CC 的通用文本摘要不行）：

```
CC 的压缩：
  "搜索了 3 个文件，修改了 foo.ts 第 42 行"
  → "完成了文件修改"

CN 需要的 3 层叙事压缩：

Layer 1: 对话压缩（与 CC 相同）
  旧对话轮次 → 摘要，保留最近 N 轮完整

Layer 2: 叙事上下文保持（CN 独有）
  绝不压缩: 活跃章节的 KG 节点、角色设定、伏笔
  可压缩:   已完成章节的详细讨论，只保留 summary
  标记系统: 每个 segment 有 compactable: boolean

Layer 3: 渐进式降级（CN 独有）
  Level 0: 完整上下文 (< 60% window)
  Level 1: 压缩旧对话，保留所有 narrative (60-80%)
  Level 2: narrative 也开始降采样 (80-90%)
  Level 3: 只保留活跃章节 + 角色核心 + 最近 3 轮 (90-95%)
  Level 4: 强制 hard boundary (> 95%)
```

### 2.3 Token Budget 中文修正

**为什么是 P0**：基础准确性问题。当前 `UTF8_BYTES_PER_TOKEN = 4` 对中文系统性偏差 30-50%。所有依赖 token 估算的决策（预算分配、压缩触发、成本计算）都在这个偏差上累积。

**修正方案**：

```typescript
function estimateTokens(text: string): number {
  const bytes = new TextEncoder().encode(text).length;
  // CJK Unified Ideographs + Ext A/B + 日文假名 + 韩文音节 + CJK 标点 + 全角字符
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/gu) || []).length;
  const nonCjkBytes = bytes - cjkChars * 3;
  // CJK: ~1.5 tokens/char, non-CJK: ~0.25 tokens/byte
  return Math.ceil(cjkChars * 1.5 + nonCjkBytes / 4);
}
```

---

## 三、P1 项目详解

### 3.1 用 LLM 替代关键词路由

当前 skillRouter 的 15 条关键词规则是整个 Skill 系统最弱的一环。

**方案**：混合模式
- 保留关键词匹配作为快速路径（"续写" → 确定性匹配，零延迟）
- 关键词未命中时 fallback 到 LLM 分类（"帮我让这个角色出场更有戏剧张力" → LLM 判断 expand 或 rewrite）

### 3.2 ToolSearch 延迟加载思路

**CC 做了什么**：工具不一次性全部加载到 system prompt，大部分 deferred，需要时通过搜索加载完整 schema。

**CN 为什么需要**：
1. Skill 数量会增长（builtin ~15 + 用户自定义 + 第三方）
2. 每个 skill prompt 几百到几千字，全部注入浪费上下文
3. 节约的 2000-5000 tokens 全部给创作文本

**CN 应用**：system prompt 只列 skill 名称 + 一行描述。需要时再加载完整 prompt template。这同时解决了 skillRouter 的弱点——LLM 可以根据名称和描述自然选择。

### 3.3 Tool 并发标记 + `isConcurrencySafe` 分区编排

**CC 核心**：连续的 `isConcurrencySafe=true` 工具合成并行 batch，遇到 `false` 开新的串行 batch。注意：`isConcurrencySafe` 是独立于 `isReadOnly` 的安全性标记，默认值为 `false`（fail-closed）。

**CN 适配**：CN 的 Skill 粒度比 CC 的 Tool 粗。不应该在 Skill 级别做并发标记，而是在 Skill 内部的 Step 级别做：

```typescript
interface SkillStep {
  name: string
  concurrencySafe: boolean  // 读KG、读记忆 → true；写文档、调LLM → false
  execute(ctx: StepContext): Promise<StepResult>
}
```

| 场景 | 当前 CN 行为 | 改造后 |
|------|-------------|--------|
| 续写 + KG 查询 | 串行 | 并发（都标记 `isConcurrencySafe=true`） |
| 3 段续写方案 | 串行排队 | 并发（互相独立，各自 `isConcurrencySafe=true`） |
| KG 更新 + Memory 写入 | 串行 | 并发（写不同存储，可标记 `isConcurrencySafe=true`） |

### 3.4 成本追踪

从 CC 的 `cost-tracker.ts` 搬：per-model 追踪、prompt cache 命中率、会话成本持久化、成本展示。接入 CN 的 `statsService`。

### 3.5 任务状态机

从 CC 的 `Task.ts` 直接搬：`pending | running | completed | failed | killed`。CN 追加 `paused` 状态（用户暂时切走）。`generateTaskId()` 和 `isTerminalTaskStatus()` 完全通用。

### 3.6 Post-Sampling Hooks 框架

CC 在 LLM 响应完成后执行 hook 链：记忆提取、置信度评分、提交归因。

CN 应用：

```typescript
const postWritingHooks = [
  { name: 'auto-save-version', condition: hasDocumentChanges },
  { name: 'update-kg', condition: mentionsCharacters || mentionsLocations },
  { name: 'extract-memories', condition: isSessionEnd },
  { name: 'quality-check', condition: wordCount > 500 },
]
```

---

## 四、P2 项目详解

### 4.1 Forked Agent — Cache 共享多候选续写

**CC 的精巧设计**：fork 子 Agent 共享父的 messages prefix → API prompt cache 命中 → 子 Agent 近乎只为 directive 付费。

**CN 应用**：

```
同一个上下文 fork 3 次：
  Fork A: "续写 500 字，暗黑风格" 
  Fork B: "续写 500 字，温暖基调"
  Fork C: "续写 500 字，悬疑转折"
  
3 个 fork 共享 cache prefix → 近乎只为各自 directive 付费
+ Fork D: Judge 评分（也共享同一 cache）
= 4 次 API 调用，成本接近 1.3 次
```

要搬的核心：`CacheSafeParams` 概念 + `saveCacheSafeParams()` + `cloneContentReplacementState()` + `createChildAbortController()`。

### 4.2 Coordinator → 写作流水线编排器

**CC 的 Coordinator**：纯编排 Agent，只有 spawn/send/stop 三个工具，不能直接执行任何操作。

**CN 改造**：从"任务分解到多个并行 worker"变为"写作管道多阶段流水线"：

```
CC: 用户 → Coordinator → [Worker A] + [Worker B]（并行）→ 合成
CN: 用户 → Orchestrator → Context Load → Draft → Judge → if 分低 → Refine → 呈现
```

可复用的：Worker 结构化汇报模式、"不要有废话"的 prompt 思路
必须改的：CC 的 worker 是并行的，CN 多数阶段是流水线的

### 4.3 Skill 阶段能力白名单

从 CC 的 `ASYNC_AGENT_ALLOWED_TOOLS` 直接搬概念，但粒度更细：

```typescript
const STAGE_CAPABILITIES = {
  'context-load': ['kg:query', 'memory:recall', 'document:read'],
  'draft':        ['llm:generate', 'document:read'],
  'judge':        ['llm:evaluate', 'document:read'],       // 不能修改文档
  'refine':       ['llm:generate', 'document:read', 'document:write'],
  'commit':       ['document:write', 'version:commit'],
}
```

### 4.4 MCP 接口设计参考

不需要集成 MCP 协议本身，但参考其设计来定义 CN 的 Skill Plugin Protocol：
- JSON Schema 描述 + 动态加载 → 第三方 Skill 扩展协议
- Transport 抽象（stdio / streamable-http）→ AI Service 多后端抽象

### 4.5 CLI 基座架构

详见 [08-CLI-BACKBONE-ELECTRON.md](./08-CLI-BACKBONE-ELECTRON.md)。核心是新建 `CommandDispatcher`——所有操作（无论来自 GUI IPC 还是未来 CLI stdin）走统一的 `execute() → AsyncGenerator<Event>` 路径。

### 4.6 其他 P2 项目

- **AbortController 层级**：Session → Request → Skill → Provider 四级
- **会话恢复**：CN 用 SQLite 存会话，比 CC 的文件系统更适合
- **启动并行优化**：DB/Embedding/FS 并行初始化
- **Unicode 安全清理**：创意文本更容易含特殊字符
- **Tool 结果截断存储**：大段续写超阈值时只保留摘要 + 完整版存入版本

---

## 五、不需要搬的

| CC 能力 | 理由 |
|---------|------|
| Ink React TUI | CN 有真正的 Web UI |
| Commander.js CLI 解析 | CN 不需要传统 CLI 参数 |
| REPL stdin loop | CN 是事件驱动 GUI |
| Git 集成（git 命令族） | CN 有自己的版本系统 |
| BashTool（当前） | 创作工具暂不需要 shell 执行 |
| Remote Agent | CN 不需要远程环境 |
| Bridge 通信协议 | CN 是 Electron IPC，不需要 NDJSON bridge |
| OAuth/JWT 认证 | CN 的认证模型不同 |
| MDM 企业管理 | 不适用 |
| GrowthBook 特性开关 | CN 用 runtimeGovernance 即可 |

---

## 六、复杂度 × 收益矩阵

```
        高收益
          │
    P0    │    P1
  权限+压缩 │  路由重构+延迟加载+成本
  Token修正 │  并发+状态机+Hooks
          │
──────────┼──────────── 
          │
    P2    │    P3
  Fork+CLI │  BashTool
  编排+白名单│  Swarm+MCP
          │  推测执行
          │
        低收益
  低复杂度       高复杂度
```
