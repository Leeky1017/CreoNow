# Claude Code 源码深度分析 × CreoNow 迁移方案（最终版）

> 基于 2026-03-31 公开的 Claude Code (CC) 源码快照  
> 分析目标：为 CreoNow (CN) 提取可落地的架构模式、工程实践和优化方向  
> 本版本整合了多轮审计纠正，消除了前期报告中的乐观偏差和武断否定

口径说明：当前 `analysis-report/` 目录共有 16 份主报告文件（`00-15`，含本索引），另有 `14-CC-SOURCE-MIGRATION-MAP.old.md` 与 `文章原文内容.md` 作为补充材料。不要把“分析文档数量”误读成“OpenSpec 模块数量”。

---

## 报告目录

| # | 文件 | 内容 |
|---|------|------|
| 01 | [CC 整体架构全景](./01-CC-ARCHITECTURE.md) | 分层架构、模块关系、设计哲学（一切皆 Tool / 编译时 DCE / 并行预取） |
| 02 | [CC 核心引擎](./02-CC-CORE-ENGINE.md) | QueryEngine 循环、Tool 类型系统、`isConcurrencySafe` 分区编排、StreamingToolExecutor、状态管理 |
| 03 | [CC AI 模式](./03-CC-AI-PATTERNS.md) | 上下文工程、AutoCompact、Forked Agent 记忆提取、成本追踪、Prompt Cache |
| 04 | [CC 插件与技能系统](./04-CC-PLUGIN-SKILL.md) | Plugin/Skill/MCP 三层扩展、Agent Swarm、Coordinator 模式、Hooks 生态 |
| 05 | [CC 工程实践](./05-CC-ENGINEERING.md) | 启动优化、Feature Flag、Permission、错误处理、AbortController 层级 |
| 06 | [**CN 现状与真实成熟度审计**](./06-CN-CURRENT-STATE.md) | Memory/Context/Skill 三大系统逐行审计、真实优势 vs 过度设计、缺失能力 |
| 07 | [**能力迁移完整评估**](./07-TRANSFERABLE.md) | CC 全部能力逐项判定（搬/改/不搬）、P0-P3 优先级、复杂度×收益矩阵 |
| 08 | [**CLI 基座 × Electron 方案 × UI/UX**](./08-CLI-BACKBONE-ELECTRON.md) | CLI-as-backbone 架构映射、8 系统 Electron 落地代码、UI/UX 迁移模式 |
| 09 | [**实施指南**](./09-IMPLEMENTATION-GUIDE.md) | 每个迁移项的文件规划、核心类型、关键代码、集成点、8 周执行时间线 |
| 10 | [**CN OpenSpec 深度架构分析**](./10-CN-OPENSPEC-DEEP-ANALYSIS.md) | 15 模块逐一审计、4 大系统性缺陷、V1 复杂度超标分析、架构优先级建议 |
| 11 | [**CN 开发战略（非技术文档）**](./11-CN-DEVELOPMENT-STRATEGY.md) | 面向决策者的完整开发路线：现状分析 → 核心问题 → CC 经验提炼 → 6 阶段路线图 → 关键决策 |
| 12 | [**CN 开发战略 GPT 版**](./12-CN-DEVELOPMENT-STRATEGY-GPT.md) | 单独写给非技术读者的澄清版：先讲清背景和口径，再讲为什么现有架构会失控，最后给出按阶段推进的实际开发方案 |
| 13 | [**CN 最终架构设计**](./13-CN-FINAL-ARCHITECTURE.md) | 汇总 CC 审计与 CN 目标后的最终架构落点 |
| 14 | [**CC 源码迁移地图（综合版）**](./14-CC-SOURCE-MIGRATION-MAP.md) | 基于双源码版本盘点后的迁移地图与模块级建议 |
| 15 | [**CC 报告审计 × 源码交叉验证 × CN 最终迁移方案**](./15-CC-CROSS-AUDIT-AND-CN-MIGRATION.md) | 对 `00-14` 全量打分、纠错、增量盘点、编排评估与文件级迁移清单 |

---

## 先看这个

如果你现在最关心的是“CN 接下来到底该怎么做”，建议先读：

1. [12-CN-DEVELOPMENT-STRATEGY-GPT.md](./12-CN-DEVELOPMENT-STRATEGY-GPT.md)
2. [10-CN-OPENSPEC-DEEP-ANALYSIS.md](./10-CN-OPENSPEC-DEEP-ANALYSIS.md)
3. [08-CLI-BACKBONE-ELECTRON.md](./08-CLI-BACKBONE-ELECTRON.md)

---

## 核心结论

### 一、CC 不能完全复刻，也不应该完全复刻

CC 是面向开发者的 CLI Agent，CN 是面向创作者的 Electron 桌面应用。两者的用户模型、交互模式、核心价值完全不同。逐项评估后：

- **可以搬的核心逻辑**：4 个（任务状态机、阶段白名单、成本追踪、Post-Writing Hooks）
- **必须改造的高价值模式**：6 个（AutoCompact、Permission、并发编排、Fork Cache、ToolSearch 思路、Coordinator 思路）
- **不需要的**：~60%（Git 集成、BashTool、Remote Agent、Ink TUI、OAuth、MDM 等）

### 二、CN 的三大核心系统并非"比 CC 强"

逐行审计后发现：
- **Memory**：代码质量高（★★★★☆）但 distill pipeline 和 decay 参数未经验证
- **Context**：Token 估算对中文系统性偏低 30-50%（`UTF8_BYTES_PER_TOKEN = 4` 对中文不准）
- **Skill**：关键词路由是整个系统最弱的一环——CC 让 LLM 自选工具的方式根本性更优

### 三、之前被武断否定的 CC 能力实际有重大价值

| 被否定的能力 | 修正后判定 | 理由 |
|-------------|-----------|------|
| **Permission** | **P0 必须做** | AI 修改用户原稿前必须有确认层——创作工具的生命线 |
| **ToolSearch** | **P1 应该做** | 延迟加载 skill 定义可节约 4500 tokens 给创作上下文 |
| **MCP 设计模式** | P2 参考 | 应参考其接口设计来定义 CN 的 Skill Plugin Protocol |
| **BashTool 安全模型** | P3 储备 | 未来本地工具集成时直接可搬 |

### 四、最紧迫的三件事

1. **保护用户原稿**（Permission Gate）— 不做这个就上线是灾难
2. **修正中文 token 估算**（1.5 tokens/CJK char）— 所有上下文决策的基础
3. **用 LLM 替代关键词路由**（混合模式）— 让最强的组件做最关键的决策

### 五、CLI 基座方案

用户看 Cursor/Notion 式界面，Agent 在 CLI 层干活——CC 恰好就是这个架构。CN 的第一步不是重构 IPC，而是新建 `CommandDispatcher`：所有操作（GUI IPC / 未来 CLI stdin / 未来 SDK API）走统一的 `execute() → AsyncGenerator<Event>` 路径。

### 六、关键数据修正（基于 `claude-code-best` 源码验证）

| 项目 | 早期报告值 | 验证后真实值 |
|------|-----------|------------|
| Feature Flags | "约 30 个" | **85+ 个**（grep 全量扫描） |
| Hooks | "约 80 个" | **147 个文件**（覆盖 UI/权限/通知/历史/IDE diff） |
| 工具并发模型 | "只读并发/写入串行" | **`isConcurrencySafe` 独立标记**（≠ isReadOnly） |
| `getSystemContext` | "日期/OS/工具" | **Git 状态 + Cache Breaker** |
| `getUserContext` | "Git 状态" | **CLAUDE.md + 日期** |
| `claude-code-best` 新增 6 个顶层模块 | "成熟新能力" | **全部为 auto-generated stub** |
| native 包 | "多数 stub" | **audio/image/modifiers/color-diff 均为真实现** |
| Coordinator | "已稳定上线" | **受 feature gate + env 双重控制** |

---

## 8 周执行路线图

```
Week 1-2:  P0 — Token 修正 + Permission Gate + AutoCompact 框架
Week 3-4:  P1 — LLM 路由 + 延迟加载 + 任务状态机 + 成本追踪
Week 5-6:  P1 — 并发编排器 + Post-Writing Hooks
Week 7-8:  P2 — Fork Cache 共享 + CommandDispatcher
```
