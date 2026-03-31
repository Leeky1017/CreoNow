# 06 — CreoNow 项目现状：架构评估 × 真实成熟度审计

> 本章包含对 CN 三大核心系统的逐行源码审计结果。
> **关键立场**：复杂 ≠ 更强。代码质量高 ≠ 经过验证。

---

## 6.1 项目定位

| 维度 | CreoNow | Claude Code |
|------|---------|-------------|
| 定位 | AI-native 创意写作 IDE | AI Agent CLI |
| 用户 | 创意写作者（小说/剧本/内容） | 开发者 |
| 平台 | Electron 桌面应用 | 终端 CLI |
| 运行时 | Node.js (Electron) | Bun |
| UI | React (Web via Electron renderer) | React + Ink (Terminal) |
| 数据库 | SQLite (better-sqlite3) | 文件系统 |
| 构建 | electron-vite | Bun bundle |
| 包管理 | pnpm monorepo | — |

## 6.2 架构分析

### 6.2.1 分层架构

```
┌─────────────────────────────────────────┐
│  Renderer (前端)                         │
│  React + Tailwind + Design Token        │
│  creonow-app/ (Next.js)                 │
├─────────────────────────────────────────┤
│  Preload (桥接层)                       │
│  contextBridge.exposeInMainWorld        │
├─────────────────────────────────────────┤
│  Main Process (后端)                    │
│  ├── IPC Layer (contract-based, 20+频道)│
│  ├── Service Layer (17 服务模块)        │
│  ├── DB Layer (SQLite)                  │
│  └── Skills Layer (可编程 AI 能力)      │
├─────────────────────────────────────────┤
│  Shared Layer (跨进程)                  │
│  Types + Utils + Token Budget           │
└─────────────────────────────────────────┘
```

### 6.2.2 服务模块

| 服务 | 描述 |
|------|------|
| **ai** | 多 Provider、流式、消息管理 |
| **context** | 分层组装、Token 预算 |
| **documents** | CRUD、分支、合并、版本 |
| **embedding** | 局部嵌入模型 |
| **kg** | 知识图谱：实体、关系、状态追踪 |
| **memory** | 情景记忆、偏好学习 |
| **rag** | 混合排序、查询规划 |
| **skills** | 加载、执行、调度、校验 |
| **judge** | AI 质量评判 |
| **projects / search / stats / export** | 基础功能 |

### 6.2.3 IPC 契约系统

代码生成的类型安全 IPC：`contract:generate` 从处理器提取类型，`contract:check` CI 门禁验证。覆盖 20+ 频道。

---

## 6.3 三大核心系统——真实成熟度审计

### 总体判定

| 系统 | 代码质量 | 真实成熟度 | 关键弱点 |
|------|---------|-----------|---------|
| Memory | ★★★★☆ | 未经产品验证 | distill pipeline 依赖未验证的 LLM 分类 |
| Context | ★★★☆☆ | 可用但未经压力测试 | Token 估算对中文系统性偏低 30-50% |
| Skill | ★★★☆☆ | 全链路存在但路由弱 | 关键词路由是最弱的意图识别方式 |

---

### 6.3.1 Memory 系统审计

**已实现的（真实代码，非空壳）**：
- **memoryService.ts** ~500 行：完整 CRUD，三层 scope（global/project/document），referential integrity 校验，semantic + deterministic 双模式注入，降级策略
- **userMemoryVec.ts** ~300 行：sqlite-vec 真向量索引，topK 语义查询，中文语义别名映射（CC 没有），FNV-1a hash fallback
- **preferenceLearning.ts** ~250 行：加权反馈评分，阈值自动 upsert，privacy mode
- **episodicMemoryService.ts** ~400+ 行：完整生命周期（record → decay → compress → evict → purge），隐式信号推断（edit distance），冲突队列
- 5 个测试文件

**问题**：
1. distill pipeline 的 LLM 分类质量未验证——提炼出的规则是否真有用？不知道
2. Decay 参数硬编码（`0.98`, `14 days`）——无证据最优
3. 向量维度默认 64——对"忧伤" vs "惆怅"可能不够
4. 中文语义别名只有 10 条——好想法但玩具级

**与 CC 的对比**：CC 的 memory 极简（文件 CRUD），但已在数百万用户中验证。CN 更精密但零用户验证。**不能说 CN 更强，只能说更复杂。**

---

### 6.3.2 Context 系统审计

**已实现的**：
- **layerAssemblyService.ts** ~200+ 行：四层架构（rules → settings → retrieved → immediate），Fetcher 模式，降级计数器，SLO（p95: 250ms）
- **tokenBudget.ts** 55 行：UTF-8 字节估算（4 bytes/token），边界安全处理
- 14 个测试文件

**问题**：
1. **Token 估算对中文不准确**：4 bytes/token 是英文合理值。中文每字 3 bytes UTF-8 但 ~1.5 tokens。CN 的 budget 系统性偏低，浪费上下文容量
2. `DEFAULT_TOTAL_BUDGET_TOKENS = 6000`——对长篇小说极其保守
3. 四层固定架构——加新类型上下文需改代码而非配置

**与 CC 的对比**：CC 没有分层 budget（用 AutoCompact 暴力解决）。CN 有分层预算但估算不准。两者都有缺陷。

---

### 6.3.3 Skill 系统审计

**已实现的**：
- **skillRouter.ts** ~200 行：15 条关键词规则（中英文），否定/双重否定检测
- **skillScheduler.ts** ~200 行：会话级队列，dependsOn 依赖检查
- **skillExecutor.ts** ~200 行：解析 → 检查 → 模板渲染 → 执行
- **skillValidator.ts** ~250 行：Frontmatter 解析，严格类型校验
- 12 个测试文件

**问题**：
1. **关键词路由**是 15 条硬编码规则。CC 让 LLM 自己选工具——根本性地更优
2. `dependsOn` 依赖系统无 skill 使用——过度设计
3. Synopsis output validation 对创意写作过于死板

**与 CC 的对比**：CC 的 tool 系统（LLM 决定 → 执行 → 返回）链路短，每一环依赖 LLM 强推理。CN 链路更长但每一环都比 CC 弱。**CC 的简单设计实际上更强。**

---

## 6.4 CN 的真实优势

| 优势 | CC 有无 | 说明 |
|------|---------|------|
| KG 知识图谱 | ❌ | 角色/事件/地点结构化 + CTE 图查询，对长篇创作真正有价值 |
| Episodic Memory 隐式反馈 | ❌ | edit distance → implicit signal，比手动指令更适合创作 |
| 降级策略一致性 | ❌ | DegradationCounter 跨模块统一 |
| 文档版本系统 | 部分 | Git-like 分支/合并/三方 diff（CC 只有文件快照） |
| AI Judge | ❌ | 内置质量评估 |

## 6.5 可能的过度设计

| 组件 | 问题 | 建议 |
|------|------|------|
| `dependsOn` 依赖图调度 | 无 skill 使用 | 删掉，需要时再加 |
| Synopsis output validation | 字数/段落/list marker 限制 | 改为建议而非拒绝 |
| Semantic memory 五类分类 | LLM 分类准确性未验证 | 先用简单 tag 验证 |
| 64 维向量空间 | 细粒度可能不够 | 需基准测试 |

## 6.6 CN 当前缺失的关键能力

| 缺失能力 | 影响 | CC 对应 |
|----------|------|--------|
| 上下文自动压缩 | 长篇对话超 context window | autoCompact |
| 原稿保护/权限确认 | AI 修改原稿无确认 | Permission 系统 |
| Skill 延迟加载 | skill 定义占用 context | ToolSearch |
| 流式 Skill 编排 | 多 skill 只能串行 | StreamingToolExecutor |
| 成本追踪 | 用户不知 AI 消耗 | cost-tracker |
| 会话恢复 | 无法继续上次对话 | sessionStorage |
| Forked Agent | 无低成本后处理 | forkedAgent |
| LLM 驱动意图识别 | 关键词路由太弱 | LLM 自选 Tool |
| CLI 基座 | 执行核心绑定 UI | StructuredIO |
