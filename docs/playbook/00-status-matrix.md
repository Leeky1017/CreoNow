# 模块成熟度矩阵 + INV 合规现状

> 最后更新：2026-04-11
>
> 本文件记录 CN 各后端模块的成熟度评分、所属阶段、关键问题，以及 10 条全局不变量（INV）的合规状态。
> 任何任务开始前，先来这里确认目标模块的当前状态。

---

## 一、模块成熟度矩阵

| 模块 | 分数 | P 阶段 | 状态 | 关键问题 |
|------|------|--------|------|---------|
| Context Engine | 9/10 | P1 ✅ | 生产就绪 | 无（50+ 测试，CJK 正确） |
| Version Control | 8.5/10 | P1 ✅ | 生产就绪 | 压缩仅占位；Hook 框架已建但未全激活 |
| Search (FTS5) | 8/10 | P1 ✅ | 生产就绪 | 跨表联合搜索未完成 |
| Export | 7/10 | P1 ⚠️ | 功能可用 | 静默错误处理违反 INV-10，无导出进度回调 |
| AI Service | 6/10 | P1 ⚠️ | 部分完成 | INV-6/7 违规：IPC 直调 Service 绕过 Skill；4 个 silent catch；Agentic loop 未完成 |
| Knowledge Graph | 6.5/10 | P3 ⚠️ | 范围蔓延 | CRUD 扎实但 Mock recognizer 在生产；Aho-Corasick 无缓存 |
| Documents | 6/10 | P1 ⚠️ | 部分完成 | ProseMirror JSON 存储 ✓；分支代码属 P3+ 范围蔓延 |
| Skills | 6/10 | P1 ⚠️ | 部分完成 | Orchestrator 9 阶段正确；Manifest Loader 孤立未调用；写回路径歧义 |
| Memory | 5.5/10 | P3 ⚠️ | 部分完成 | 简单 CRUD ✓；Episodic/Semantic 为空壳 |
| Diff | 6/10 | P2 ✅ | 功能可用 | Myers 算法正确 20 测试 ✓；未集成到编辑器 |
| Judge | 5/10 | P2 ⚠️ | 骨架 | 状态机有模型无 E2E |
| Editor Backend | 3/10 | P1 ❌ | 仅 Stub | 只有类型定义，逻辑在 Renderer |

### 评分标准

- **9-10**：生产就绪，测试充分，INV 合规
- **7-8**：功能可用，有小问题但不阻塞闭环
- **5-6**：部分完成，核心路径可走但有 INV 违规或空壳
- **3-4**：骨架/Stub，不可用于闭环 Demo
- **1-2**：仅文件存在，无实质逻辑

---

## 二、INV 合规状态

| INV | 名称 | 当前状态 | 修复优先级 | 说明 |
|-----|------|---------|-----------|------|
| INV-1 | 原稿保护 | ✅ | — | `orchestrator.ts` 写前检查已实现 |
| INV-2 | 并发安全 | ✅ | — | `toolRegistry.ts:76` 强制 `isConcurrencySafe` 默认 false |
| INV-3 | CJK Token | ⚠️ | P1 | `services/context/tokenEstimation.ts` 正确；`packages/shared/tokenBudget.ts` 仍用 4:1 |
| INV-4 | Memory-First | ⚠️ | P3 | L0 (user_memory 表) + L2 (KG + FTS5) 有；L1 (daily journal / session-aware) 未实现 |
| INV-5 | 叙事压缩 | ❌ | P4+ | `narrativeCompact.ts` 仅占位，无实际压缩逻辑 |
| INV-6 | 一切皆 Skill | ❌ | **P1 关键** | IPC handlers 绕过 Skill 系统直调 AI Service |
| INV-7 | 统一入口 | ❌ | **P1 关键** | CommandDispatcher 未实现，IPC handler 直调 Service |
| INV-8 | Hook 链 | ⚠️ | P3 | 框架在 `orchestrator.ts` Stage 8，仅 cost-tracking + auto-save 启用 |
| INV-9 | 成本追踪 | ⚠️ | P3 | costTracker 存在但 `cachedTokens` 未传入 |
| INV-10 | 错误不丢上下文 | ⚠️ | P1 | `makeFailureEvent` 存在，4+ 模块 silent catch 违规 |

### INV 合规路线图

```
P1 必须修复：INV-3, INV-6, INV-7, INV-10
P3 必须修复：INV-4, INV-8, INV-9
P4+ 必须修复：INV-5
已合规：INV-1, INV-2
```

---

## 三、DB 表清单

27 migrations 产出的关键表：

| 表名 | 所属模块 | 说明 |
|------|---------|------|
| `documents` | Documents | 文档主表（ProseMirror JSON） |
| `document_versions` | Version Control | 版本快照 |
| `kg_entities` | Knowledge Graph | KG 实体（角色/地点/阵营/道具/事件） |
| `kg_relations` | Knowledge Graph | KG 关系（实体间边） |
| `documents_fts` | Search | FTS5 全文搜索虚拟表 |
| `chat_sessions` | AI Service | 对话会话 |
| `chat_messages` | AI Service | 对话消息 |
| `write_sessions` | AI Service | 写作会话（Skill 执行上下文） |
| `projects` | Project Management | 项目元数据 |
| `custom_skills_definition` | Skills | 用户自定义 Skill 定义 |
| `judgment_record` | Judge | 质量评判记录 |
| `skill_executions` | Skills | Skill 执行日志（含 cost） |

---

## 四、关键文件路径速查

| 关注点 | 路径 |
|--------|------|
| Skill Orchestrator（9 阶段 pipeline） | `apps/desktop/main/src/core/skillOrchestrator.ts` |
| AI IPC（INV-6 违规点） | `apps/desktop/main/src/ipc/ai.ts`, `apps/desktop/main/src/ipc/aiProxy.ts` |
| KG IPC（INV-6 违规点） | `apps/desktop/main/src/ipc/knowledgeGraph.ts` |
| Token 估算（正确版） | `apps/desktop/main/src/services/context/tokenEstimation.ts` |
| Token 预算（INV-3 违规） | `packages/shared/tokenBudget.ts` |
| 叙事压缩占位 | `apps/desktop/main/src/services/ai/compact/narrativeCompact.ts` |
| Skill Manifest Loader（孤立） | `apps/desktop/main/src/services/skills/` |
| Memory 服务 | `apps/desktop/main/src/services/memory/` |
| Cost Tracker | `apps/desktop/main/src/core/skillOrchestrator.ts`（Stage 8 内） |
| Hook 框架 | `apps/desktop/main/src/core/skillOrchestrator.ts`（Stage 8） |
| 后端质量评估（完整版） | `docs/references/backend-quality-assessment.md` |
