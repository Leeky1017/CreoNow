# P4+：高级智能 — 完整 Memory + KG 可视化 + 语义搜索

> 「工善其事，知人之心。」P4+ 是 CN 从"好用的工具"进化为"不可替代的创作伙伴"的阶段。

## 目标验收场景

用户长期使用 CN → Memory 系统深度理解用户写作风格 → KG 可视化呈现完整世界观 → 语义搜索找到相关段落 → 叙事压缩保证上下文不溢出 → AI 的输出质量随使用时间持续提升。

## 进入条件

P3 全部退出条件满足 + INV-1~INV-10 全部合规。

## 任务列表

### TASK-P4-01: Memory 三层完整架构

**当前状态**：L0 (user_memory) ✓ · L1 (session-aware) P3 实现 · L2 (KG+FTS5) ✓ · Episodic/Semantic 空壳

**目标**：
- Episodic Memory：记录每次写作 session 的关键事件（角色引入、剧情转折、重大修改）
- Semantic Memory：从多次 session 中提取持久化的写作偏好、叙事模式、风格指纹
- 检索路径：KG+FTS5 为主 → sqlite-vec 语义召回补充（INV-4）

**文件**：
- `apps/desktop/main/src/services/memory/episodicMemoryService.ts` — 情景记忆主服务（已落地）
- `apps/desktop/main/src/services/skills/postWritingHooks.ts` — INV-8 hook 链（含 episodic 提取）
- `apps/desktop/main/src/services/memory/userMemoryVec.ts` — sqlite-vec 已实现，优化召回精度

**新 Migration**：
- `0012_memory_episodic_storage.sql`：episodic + semantic placeholder 的当前 SSOT
- `0028_memory_session_events.sql`：session memory 事件流（非 episodic 主表）
- `0029_project_milestones.sql`：项目里程碑事件（Engagement，不是 semantic profile）

**Skill 依赖**：
- `extract-session-events` Skill：从写作 session 提取关键事件（LLM，post-writing hook）
- `update-writing-profile` Skill：从累积 session 事件中提取持久偏好（LLM，定期触发）

**INV**：INV-4（Memory-First），INV-6（Skill 注册），INV-8（Hook 触发）

---

### TASK-P4-02: KG 高级可视化

**当前状态**：KG 只有列表 CRUD，无图可视化

**目标**：
- 力导向关系网络图（d3-force 或 @antv/g6）
- 实体按类型染色（角色/地点/阵营/事件/物品 → 不同色相，走 Design Token）
- 关系线按强度/类型区分（粗细 + 虚实 + 标签）
- 交互：点击实体 → 侧边栏详情；拖拽重新布局；缩放 + 平移
- 性能：1000 实体 + 5000 关系 → 60fps

**文件**：
- `apps/desktop/renderer/src/features/kg/KnowledgeGraphCanvas.tsx`（新建）
- `apps/desktop/renderer/src/features/kg/useGraphLayout.ts`（新建）
- `figma_design/前端完整参考/src/app/components/knowledge-graph.tsx`（黄金设计源参考）

**INV**：无特殊 INV 约束（纯前端渲染）

---

### TASK-P4-03: 语义搜索集成

**当前状态**：FTS5 全文搜索可用，sqlite-vec 已集成但仅用于 Memory

**目标**：
- 项目级语义搜索：用自然语言搜索相关段落
- 索引：写作完成后异步索引新段落 embedding（INV-8 post-writing hook）
- 查询：FTS5 关键词匹配 ∪ sqlite-vec 语义召回 → 排序合并
- UI：搜索结果面板，每条结果显示段落摘要 + 相关度评分 + 出处

**文件**：
- `apps/desktop/main/src/services/search/semanticSearch.ts`（新建）
- `apps/desktop/main/src/ipc/search.ts`——扩展 search:semantic:query 通道
- `figma_design/前端完整参考/src/app/components/` — 无直接对应，参考已有搜索面板

**INV**：INV-4（搜索路径），INV-8（索引 hook）

---

### TASK-P4-04: 叙事压缩优化（AutoCompact v2）

**当前状态**：P3 实现基础版 AutoCompact

**目标**：
- 多策略压缩：摘要替换 / 引用折叠 / 低优先级丢弃
- 压缩质量评估：压缩后 KG 一致性不降低（consistency-check Skill 验证）
- 用户可预览压缩结果并回退
- 压缩历史记录（可查看被压缩的原文）

**INV**：INV-5（保护规则不变），INV-1（压缩是写操作 → Permission Gate）

---

### TASK-P4-05: AI Agentic Loop 完善

**当前状态**：AI Service 有 agentic loop scaffolding 但未完成

**目标**：
- 多步骤 AI 推理：用户给出高级指令 → AI 分解为多步 → 逐步执行 → 汇报
- 每步走 Skill 系统（INV-6）
- 每步有中间结果预览，用户可中断/修改/继续
- 超时 60s 门禁（单步）

**文件**：
- `apps/desktop/main/src/services/ai/agenticLoop.ts`
- `apps/desktop/main/src/core/skillOrchestrator.ts` — 扩展多步编排

**INV**：INV-6, INV-7, INV-9, INV-10

---

## 退出条件

- [ ] Memory 三层完整运行（L0 + L1 + L2 + Episodic + Semantic）
- [ ] KG 力导向可视化可用（1000 实体 60fps）
- [ ] 语义搜索可用（FTS5 + sqlite-vec 联合）
- [ ] AutoCompact v2 + 用户可预览
- [ ] Agentic loop 可执行多步任务
- [ ] INV-1~INV-10 全部合规
