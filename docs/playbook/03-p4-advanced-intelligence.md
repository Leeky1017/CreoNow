# P4+：高级智能 — 完整 Memory + KG 可视化 + 语义搜索

> 「工善其事，知人之心。」P4+ 已经开始发生，不再只是纸上谈兵。

## 当前总判断

- **已落地**：KG Graph Canvas、semantic / hybrid search、episodic memory 主服务、部分 engagement foundations。
- **部分落地**：memory 深化、AutoCompact、agentic loop。
- **仍属规划 / follow-up**：完整 semantic profile 前台化、AutoCompact v2 全 UX、Agentic loop 的 pause/modify/resume、极限性能指标。

---

## P4 任务现状

### TASK-P4-01: Memory 三层完整架构

**当前状态**：L0 ✓ · L1 session memory 服务/IPC 已有 · L2 ✓ · Episodic 主服务已落地 · Semantic distill 为部分实现

**已实现路径**：
- `apps/desktop/main/src/services/memory/episodicMemoryService.ts` — 情景记忆主服务（已落地）
- `apps/desktop/main/src/services/skills/postWritingHooks.ts` — INV-8 hook 链（含 episodic 提取）
- `apps/desktop/main/src/services/memory/userMemoryVec.ts` — sqlite-vec 已实现
- `0012_memory_episodic_storage.sql`：episodic + semantic placeholder 的当前 SSOT
- `0028_memory_session_events.sql`：session memory 事件流（非 episodic 主表）
- `0029_project_milestones.sql`：项目里程碑事件（Engagement，不是 semantic profile）

**Skill 依赖（已接入主链）**：
- `extract-session-events` Skill：从写作 session 提取关键事件（LLM，post-writing hook）
- `update-writing-profile` Skill：从累积 session 事件中提取持久偏好（LLM，定期触发）

**仍需完成**：
- `update-writing-profile` 调度与前台消费
- episodic / semantic 在 renderer 中成为真实能力，而不只是后台结构

**INV**：INV-4（Memory-First），INV-6（Skill 注册），INV-8（Hook 触发）

### TASK-P4-02: KG 高级可视化

**当前状态**：✅ 已落地第一版

- `KnowledgeGraphCanvas.tsx` 与 `KnowledgeGraphPanel.tsx` 已在 workbench 中使用
- 当前剩余矛盾不是“有没有图”，而是 **1000 节点性能与布局算法是否达标**
- follow-up：`#191`

### TASK-P4-03: 语义搜索集成

**当前状态**：✅ 已落地第一版

- search 面板已支持 FTS / semantic / hybrid
- 剩余问题是 **服务边界清晰化、写时索引 hook、首查性能目标**
- follow-up：`#192`

### TASK-P4-04: 叙事压缩优化（AutoCompact v2）

**当前状态**：🟡 服务层已在，产品链未完成

- `narrativeCompact.ts` 与测试存在
- 仍缺：preview / accept / rollback / history / Permission Gate UX
- follow-up：`#193`

### TASK-P4-05: AI Agentic Loop 完善

**当前状态**：🟡 有 scaffolding，未达到 playbook 终态

- 工具与编排能力已有基础
- 仍缺：per-step timeout、pause / modify / resume、独立模块化边界
- follow-up：`#194`

---

## 当前最优先的 P4 执行顺序

1. `#190` episodic-memory skills + hook 真收口
2. `#192` semantic search service boundary + write-time indexing
3. `#193` AutoCompact v2 预览 / 回退 / 历史
4. `#194` agentic loop 控制能力
5. `#191` KG 大图性能达标

---

## 退出条件（现实版）

- [ ] episodic / semantic memory 真正进入产品主路径
- [x] KG Graph Canvas 已可用
- [x] semantic / hybrid search 已可用
- [ ] AutoCompact v2 用户可预览与回退
- [ ] Agentic loop 可进行多步可控交互
- [ ] P4 文档不再把已落地能力写成“规划中”
