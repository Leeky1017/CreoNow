# CreoNow 后端质量深度评估报告

> 生成日期：2025-07
> 
> 评估范围：`apps/desktop/main/src/` 全部服务模块
> 
> 评估方法：逐模块交叉审查（代码阅读 + 测试验证 + Spec 对比 + INV 合规检查）

---

## 总览

| 模块 | 评分 | Phase 对齐 | 关键问题 |
|------|------|-----------|----------|
| **Context Engine** | 9/10 | P1 ✅ | 最佳模块，50+ 测试，架构优雅 |
| **Version Control** | 8.5/10 | P1 ✅ | INV-1 完整满足，三阶段提交已落地 |
| **Search** | 8/10 | P1 ✅ | FTS5 完整，40+ 测试，CJK 处理优秀 |
| **Export** | 7/10 | P1 ⚠️ | 格式渲染器可用，错误处理静默 |
| **AI Service** | 6/10 | P1 ⚠️ | 流式输出 + 重试可用，但多处 INV 违反 |
| **Knowledge Graph** | 6.5/10 | P3 ⚠️ | CRUD 稳固，但超范围实现 + 生产环境含 mock |
| **Documents** | 6/10 | P1 ⚠️ | 完整 CRUD + 版本外观层，但分支代码是 scope creep |
| **Skills** | 6/10 | P1 ⚠️ | 编排器 9 阶段管线架构正确，但关键组件未接通 |
| **Diff** | 6/10 | P2 ✅ | Myers 算法正确，20 测试，但未接入编辑器 |
| **Stats** | 6/10 | — | 骨架状态，DB 集成不明 |
| **Memory** | 5.5/10 | P3 ⚠️ | 简单 CRUD 可用，但高级功能均为空壳 |
| **Settings（角色/地点）** | 5/10 | P1 ⚠️ | 功能可用，命名混淆（实为 character/location CRUD） |
| **Judge** | 5/10 | P2 ⚠️ | 仅状态机，无模型，E2E 为 stub |
| **Editor 后端** | 3/10 | P1 ❌ | 仅类型 stub，真实逻辑在 renderer |

---

## 一、顶级模块详评

### 1. Context Engine — 9/10 ⭐

**路径**：`services/context/`

**实现状态**：
- 三层压缩（L0 始终注入 / L1 选择注入 / L2 KG+FTS5）完整实现
- Token 预算管理精确，支持 CJK 1.5 token/字估算（INV-3 合规）
- 50+ 测试覆盖核心路径
- 上下文组装管线：收集 → 排序 → 裁剪 → 注入，每一步都有独立测试

**INV 合规**：
- INV-3 ✅ CJK Token 估算正确
- INV-4 ✅ Memory-First 三层架构
- INV-5 ✅ AutoCompact 保留 KG 实体 + `compactable: false` 标记

**扣分原因**：
- 部分边界情况（超长文档截断策略）缺乏文档说明（-1）

---

### 2. Version Control — 8.5/10

**路径**：`services/documents/versionService.ts` · `services/documents/documentCoreService.ts` · `ipc/version.ts`

**实现状态**：
- `document_versions` 表真实存在于生产 DB（migration 001 + 0026）
- `insertDocumentVersionSnapshot()` 执行真实 DB 写入
- `VersionWorkflowService` 三阶段提交状态机：`snapshot-created → ai-writing → state transitions`
- `orchestrator.ts:849` 在每次 AI 写入前创建 pre-write snapshot（**fail-closed：快照失败则中止写入**）
- `writingTooling.ts:92` 在用户确认后创建 ai-accept snapshot
- 完整的快照链：`manual-save → pre-write → ai-accept → pre-rollback → rollback`
- 前端 UI：`VersionHistoryPanel` + `useVersionHistoryController` 完整实现
- 集成测试证明真实数据在 DB 中流动

**INV 合规**：
- INV-1 ✅ **完整满足**——AI 写操作必须经 Permission Gate + 版本快照，无快照则禁写

**扣分原因**：
- 快照压缩（Compaction）仅有设计，执行路径为占位符（-0.5）
- 写后 Hook 框架已搭建但未完全激活（-1.0，计划 P2）

**重要纠正**：此模块曾被误判为 2/10「仅内存 stub」。实际上这是因为混淆了测试辅助工具 `linearSnapshotStore.ts`（内存模拟）与真正的生产代码 `documentCoreService.ts`（DB 持久化）。

---

### 3. Search — 8/10

**路径**：`services/search/`

**实现状态**：
- FTS5 全文搜索引擎完整实现
- CJK tokenizer 正确处理中日韩文本（INV-3 合规）
- 40+ 测试覆盖搜索核心路径
- 搜索权重、高亮、分页、排序均已实现
- sqlite-vec 语义召回通道已集成（INV-4 合规）

**INV 合规**：
- INV-3 ✅ CJK 分词正确
- INV-4 ✅ KG+FTS5 为主检索路径，sqlite-vec 语义召回已含

**扣分原因**：
- 跨表联合搜索（文档 + KG 实体 + 记忆）未完整实现（-1）
- 搜索结果缓存策略缺失（-1）

---

### 4. Export — 7/10

**路径**：`services/export/`

**实现状态**：
- 多格式渲染器（Markdown / HTML / Word / PDF）均可工作
- ProseMirror JSON → 各格式的转换逻辑完整
- 文件写入流程可用

**扣分原因**：
- 文件写入时的错误处理为静默模式（catch 后不上报）—— 违反 INV-10 精神（-2）
- 缺少导出进度回调（大文档可能阻塞 UI）（-1）

---

### 5. AI Service — 6/10

**路径**：`services/ai/`

**实现状态**：
- 流式输出完整，支持 SSE 流
- Provider 轮换 + 重试机制可用（`providerResolver.ts` 含断路器，连续 3 次失败触发）
- 多模型支持（OpenAI / Anthropic / 本地模型）

**INV 合规问题**：
- INV-6 ❌ IPC handler 直接调用 Service，未走 Skill 体系
- INV-7 ❌ 未走 CommandDispatcher（计划实现）
- INV-10 ⚠️ 4 处静默 catch 块——错误被吞没而非上报

**具体问题清单**：
1. `ipc/ai.ts` 直接调用 AI Service，绕过 Skill 管线（INV-6 违反）
2. Tool-use loop 已搭建骨架但未实际执行（agentic 循环不工作）
3. Partial result handling 代码存在但未被调用
4. 4 处 `catch {}` 静默吞错——违反「错误不丢上下文」原则

---

### 6. Knowledge Graph — 6.5/10

**路径**：`services/knowledgeGraph/`

**实现状态**：
- 实体 CRUD 稳固，测试充分
- 查询算法（子图、路径、验证）已实现
- 图遍历、关系管理可用

**问题**：
- 超范围实现：子图查询/路径查询/图验证属于 P4+，但已在 P3 实现——增加维护负担
- **生产环境含 mock recognizer**——这是严重问题，应使用真实 NER
- Aho-Corasick trie 每次查询重建（无缓存）——性能风险
- INV-6 ❌ IPC 直调 Service
- INV-7 ❌ 未走 CommandDispatcher
- INV-10 ❌ 部分错误路径静默处理

---

### 7. Documents — 6/10

**路径**：`services/documents/`

**实现状态**：
- 完整 CRUD + 版本外观层
- ProseMirror JSON 存储
- 项目-文档层级关系正确

**问题**：
- 分支（Branch）代码属于 P3+ scope creep——P1 不需要文档分支
- 静默错误处理（部分 catch 不上报）
- `documentCoreService.ts` 职责过重——同时处理快照 + CRUD + 查询

---

### 8. Skills — 6/10

**路径**：`services/skills/`

**实现状态**：
- Orchestrator 9 阶段管线架构正确（Schema → 权限 → 上下文 → LLM → 工具执行 → 回写 → Hook → 成本 → 完成）
- Permission Gate + Post-hooks P1 骨架完成
- Agentic loop P2 基础设施搭建

**问题**：
- **Skill Manifest Loader 孤立**——解析器写了但从未被调用，新 Skill 无法动态注册
- 成本追踪未完全接通（`recordUsage` 缺失）
- 写回路径有歧义——`documentWriteback.ts` 和 `writingTooling.ts` 两个文件职责重叠

---

### 9. Memory — 5.5/10

**路径**：`services/memory/`

**实现状态**：
- 简单 CRUD（用户记忆条目的增删改查）可用于 P3
- 事件驱动同步模式正确
- sqlite-vec 语义召回（`userMemoryVec.ts`）已实现——INV-4 合规

**问题**：
- **Episodic 记忆为空壳**——scaffold 代码存在但未集成（P4 预览）
- **Semantic 记忆为空壳**——scaffold 代码存在但未集成
- INV-10 ❌ 事件处理器中的 DB 错误被静默 catch
- Decay score 函数返回 stub 值
- Token 预算截断注入缺失
- **生产代码中留有 mock 错误注入代码**

---

### 12. 其他模块简评

| 模块 | 评分 | 说明 |
|------|------|------|
| Diff | 6/10 | Myers 算法正确，20 测试，但未接入编辑器视图 |
| Stats | 6/10 | 骨架状态，DB 存取路径不明确 |
| Settings | 5/10 | 实为角色/地点 CRUD，命名易混淆（应改名为 character/location） |
| Judge | 5/10 | 仅状态机定义，无模型评估逻辑，E2E 为 stub |
| Editor 后端 | 3/10 | 仅类型定义 stub，真实的协同编辑/文档操作逻辑全在 renderer 侧 ProseMirror |

---

## 二、跨模块问题分析

### INV 违反统计

| INV | 违反模块数 | 说明 |
|-----|-----------|------|
| INV-6（一切皆 Skill） | 5+ | AI Service、KG、Documents、Memory、Settings 等均有 IPC 直调 Service |
| INV-7（统一入口） | 5+ | 同上——未走 CommandDispatcher |
| INV-10（错误不丢上下文） | 6+ | AI Service（4处）、Memory（事件处理器）、Export（文件写入）、KG（查询）、Documents 均有静默 catch |

INV-6 和 INV-7 的违反是系统性的——几乎所有模块的 IPC handler 都直接调用 Service 而非走 Skill/Command 管线。这不是 bug，而是架构演进的中间态——`CommandDispatcher` 和完整的 Skill 注册表尚未落地。

INV-10 的违反更为紧迫——**生产环境中约 40+ 处静默 catch**，这意味着错误被吞没，用户可能看到空白结果而非错误提示。

### 生产代码中的测试痕迹

| 问题 | 位置 |
|------|------|
| Mock recognizer 留在生产包 | KG 模块，NER 使用 mock 实现 |
| Mock 错误注入代码 | Memory 模块，事件处理器 |
| 测试辅助工具在导出路径 | `linearSnapshotStore.ts`（Version Control，但不影响生产） |

---

## 三、数据库层

- **28 张表**，跨 27 个 migration
- 关键表：`projects` · `documents` · `documents_fts` · `document_versions` · `user_memory_vec`（sqlite-vec）· `user_memory` · `memory_episodes` · `kg_entities` · `kg_relations` · `generation_traces` · `chat_sessions` · `chat_messages` · `cost_records` · `stats_daily`
- sqlite-vec 扩展正确加载，`user_memory_vec` 表支持语义检索

---

## 四、IPC 层

- **28 个 handler 文件**，全部存活（有真实 service 绑定）
- 无死 handler / stub handler

---

## 五、P1 就绪度总结

**P1 核心功能就绪度**：

| 功能 | 就绪 | 备注 |
|------|------|------|
| 文档 CRUD | ✅ | Documents 模块 |
| AI 写入 + 流式输出 | ✅ | AI Service（需走 Skill 管线包装） |
| 版本快照 + 回滚 | ✅ | Version Control，INV-1 满足 |
| 全文搜索（含 CJK） | ✅ | Search + FTS5 |
| 上下文引擎 | ✅ | Context Engine，最佳模块 |
| 权限门禁 | ⚠️ | Permission Gate 骨架存在，但 Skill 注册未接通 |
| 错误处理 | ❌ | 40+ 处静默 catch，需系统性修复 |
| 成本追踪 | ⚠️ | 接口已预留，UI 未实现，recordUsage 未接通 |

**评估结论**：P1 核心通路（写作 → AI 辅助 → 版本保护 → 搜索 → 上下文）的代码基本可用，但**质量不均匀**——顶级模块（Context Engine 9/10、Version Control 8.5/10）与底部模块（Editor 3/10、Judge 5/10）差距悬殊。系统性的 INV-6/7/10 违反需要在 P1 收尾前统一修复。

---

## 六、优先修复建议

### 紧急（P1 阻塞）

1. **静默 catch 全局修复**——INV-10 违反，40+ 处。错误要么重试要么上报，禁止静默吞没。
2. **生产代码中的 mock 清理**——KG 模块的 mock recognizer、Memory 模块的 mock 错误注入。

### 高优先（P1 完善）

3. **Skill Manifest Loader 接通**——解析器已写好，需要把调用链接上。
4. **成本追踪接通**——`recordUsage` 需要实际调用 cost recording 逻辑。

### 中优先（P2 准备）

6. INV-6/7 系统性修复——引入 CommandDispatcher，IPC handler 走 Skill 管线。
7. Memory 模块高级功能激活——Episodic/Semantic 从空壳变为可用。
8. Judge 模块实现——需要接入 LLM 评估模型。

---

## 七、模块-Spec 对齐矩阵

| 模块 | Spec 路径 | P1 Spec 要求 | 实现覆盖率 |
|------|-----------|-------------|-----------|
| AI Service | `openspec/specs/ai-service/` | 流式输出、多 Provider、Skill 调用 | 70%（Skill 调用链未接通） |
| Context Engine | `openspec/specs/context-engine/` | 三层压缩、Token 预算 | 95% |
| Documents | `openspec/specs/document-management/` | CRUD、ProseMirror 存储 | 85%（分支为 scope creep） |
| Editor | `openspec/specs/editor/` | ProseMirror 集成、快捷键 | 30%（后端仅 stub，逻辑在 renderer） |
| KG | `openspec/specs/knowledge-graph/` | CRUD、实体识别 | 80%（超范围，但 P3 核心满足） |
| Memory | `openspec/specs/memory-system/` | 三层记忆、注入 | 45%（CRUD 有，高级功能空壳） |
| Search | `openspec/specs/search-and-retrieval/` | FTS5、CJK | 90% |
| Skills | `openspec/specs/skill-system/` | 9 阶段管线、权限 | 65%（管线正确，注册未接通） |
| Version | `openspec/specs/version-control/` | 线性快照、三阶段提交 | 95%（P1 完整满足） |

---

*「古之善用兵者，因天之时，就地之势，依人之利，则所向无敌。」——《百战奇略》*

*模块质量不均匀不可怕——可怕的是不知道哪里不均匀。此文即为地图。*
