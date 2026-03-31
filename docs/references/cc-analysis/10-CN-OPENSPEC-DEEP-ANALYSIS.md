# 10 — CreoNow OpenSpec 深度架构分析：15 模块逐层审计

> 基于对 OpenSpec 全部 15 个 spec 文件 + 1 个 RFC 的逐行审读（总计 ~7,036 行）
> 目标：识别架构层面的系统性缺陷，而非仅表面问题

---

## 一、总体评估

### 1.1 OpenSpec 做到了什么

| 维度 | 评价 |
|------|------|
| **规格完整性** | ★★★★★ — 15 个模块每个都有 Requirement + Scenario + 异常矩阵 + NFR，这在个人项目中非常罕见 |
| **类型安全意识** | ★★★★☆ — 全线要求 Zod 校验 + TypeScript strict，IPC 契约系统设计成熟 |
| **错误处理覆盖** | ★★★★☆ — 每个模块都有异常与边界覆盖矩阵，远超多数商业项目 |
| **架构整体性** | ★★☆☆☆ — 模块间集成存在系统性裂缝（详见下文） |
| **可实施性** | ★★☆☆☆ — 设计充分但部分模块的复杂度远超 V1 必要性 |

### 1.2 核心问题：规格的丰满与架构的骨感

OpenSpec 的每个模块内部设计精细，但 **模块间的协作架构** 存在以下系统性问题：

1. **无统一编排层** — 没有一个模块负责"AI 技能执行全链路"的端到端编排
2. **数据流不闭环** — Context Engine / Memory / KG / RAG 各自定义了数据格式，但缺乏统一的数据管线
3. **跨模块事务无保障** — 项目切换、版本回滚等操作涉及多模块，但无分布式事务机制
4. **V1 范围失控** — 部分模块的 V1 设计已经包含了 V3 级别的复杂度

---

## 二、系统性架构缺陷

### 缺陷 A：缺少 AI 技能执行编排层（最关键）

**现象**：跨模块集成 spec（`cross-module-integration-spec.md`）仅 254 行，只描述了数据流方向，没有定义编排行为。

**具体问题**：当用户说"帮我润色这段话"时，完整执行链路是：

```
用户输入 → ??? → Skill Router → Context Assembly → AI Call → Result → Editor Apply
                  ↑                    ↑                              ↑
           意图从哪识别？       上下文从哪组装？            结果怎么安全应用？
```

- **Skill System** 定义了 8 个 builtin skill，但只管"执行"
- **Context Engine** 定义了 4 层上下文，但只管"组装"
- **AI Service** 定义了 LLM 调用，但只管"发送"
- **Editor** 定义了 Inline Diff，但只管"展示"

**没有任何模块定义这四者之间的完整编排流程。** 执行链路上的关键问题：

| 缺失环节 | 影响 |
|----------|------|
| Skill Router 路由完成后，谁负责组装 context？ | Skill 和 Context 模块没有定义交互协议 |
| Context 组装完成后，谁决定用哪个 model、多少 tokens？ | AI Service 和 Context 的配合未定义 |
| AI 返回结果后，谁负责校验结果质量再呈现给用户？ | Judge 和 Skill 的关系模糊 |
| 用户确认后，谁负责写文档 + 创建版本 + 更新 KG？ | 多模块写入的事务性未定义 |

**CC 如何解决**：CC 的 `QueryEngine.ts` + `query.ts` 就是这个编排层，统一管理从 prompt 组装到 Tool 执行到后处理的完整流程。CC 没有把"上下文组装"和"工具执行"分成两个独立模块。

**建议**：新增 **Orchestration Spec**，定义 AI 写作全链路编排器，统一管理 Skill Router → Context Assembly → AI Call → Result Validation → Document Apply → Post-Processing（版本快照 + KG 更新 + Memory 提取）。

---

### 缺陷 B：Context Engine 与其他模块的集成断裂

**Context Engine spec** 定义了 4 层架构（Rules / Settings / Retrieved / Immediate），但：

1. **Retrieved 层的数据源未定义契约**：spec 只说"外部 Fetcher 提供"，但 RAG / Memory / KG 各自的返回格式、token 预算分配比例、优先级排序都未在 Context Engine 中规定

2. **Rules 层的内容来源不明**：spec 说 Rules 来自"项目配置"，但 Project Management spec 的元数据中只有 `narrativePerson`、`languageStyle` 等字段——如何从这些字段生成 Rules 层的 prompt 文本？没有定义。

3. **Stable Prefix Hash 与 AI Service 的 prompt cache 策略没有对齐**：Context Engine 有 `stablePrefixHash` 概念（用于缓存优化），AI Service 有自己的 `systemPromptTemplate`——这两者的缓存语义应该统一但目前是各自为政。

**建议**：Context Engine 应明确定义每个 Fetcher 的接口契约（输入参数、返回格式、token 预算上限、超预算截断策略），并与 AI Service 的 prompt 结构对齐。

---

### 缺陷 C：跨模块操作缺乏事务保障

**Project Management spec** 要求项目切换时完成 6 项操作（编辑器、文件树、KG、Memory、Skills、当前文档），并要求"unbind ALL → 持久化切换 → bind ALL"。

但：
1. 如果 unbind 到第 3 步失败了怎么办？spec 说有"超时保护"但没定义回滚策略
2. 版本回滚涉及 Document + Version + 可能的 KG 状态——如果文档回滚成功但 KG 回滚失败呢？
3. 全项目搜索替换（Search & Retrieval spec）替换多个文档时，如果中间一个失败呢？spec 只说"为每个文档创建版本快照"，但没有定义"部分成功"的处理

**CC 如何处理**：CC 的操作粒度更细（每个 Tool 是原子操作），不需要跨模块事务。CC 的 `fileHistory.ts` 在每次修改前拍快照，失败时可逐文件回滚。

**建议**：
- 定义"部分成功"策略：是全部回滚（Saga 模式）还是继续并报告失败项？
- 对高危操作（回滚、批量替换、项目删除）引入 checkpoint 机制

---

### 缺陷 D：V1 复杂度严重超标

以下模块的 V1 设计包含了不必要的复杂度：

| 模块 | 过度复杂的部分 | V1 真正需要的 |
|------|--------------|-------------|
| **Version Control** | 分支管理 + 三方合并 + 冲突解决（分支 IPC 5 个通道） | 线性版本快照 + 简单回滚。分支合并是 V2+ 功能 |
| **Memory System** | 3 层记忆（Working/Episodic/Semantic）+ Distillation Pipeline + Decay Formula + 冲突检测 | 简单的 key-value 项目记忆 + AI 偏好记录。Distillation pipeline 在没有用户验证前无法证明有效 |
| **Knowledge Graph** | 5 种实体类型 + 关系管理 + Force-Directed 可视化 + 自动识别 + Cycle Detection + 50K 节点限制 | 角色/地点基础 CRUD + 简单列表展示。图可视化和自动识别是 V2 功能 |
| **Search & Retrieval** | 两阶段召回 + 融合重排公式 + 向量嵌入 + RAG | SQLite FTS5 全文检索即可满足 V1 需求。向量嵌入和 RAG 在本地 Electron 应用中的实用性存疑 |
| **Skill System** | 3 scope 管理 + 自定义 Skill 开发协议 + 依赖图调度 | Builtin skills 执行即可。用户自定义 skill 在没有用户基础前无需实现 |
| **Design System** | 3 层 Token 架构 + guard 测试 + Tailwind v4 桥接 | 一个 tokens.css 文件 + 直接在 Tailwind 中使用即可 |

**量化**：上述过度设计预计增加 **40-60% 的 V1 开发工作量**，但对 V1 用户体验的贡献接近 0。

**建议**：每个模块拆出明确的 "V1 Minimum" 与 "V2+ Expansion"，V1 只实现 happy path + 基本错误处理。

---

## 三、逐模块架构评审

### 3.1 AI Service（663 行）— ★★★★☆

**优点**：
- SystemPromptTemplate 的 identity / instruction / context / tools 四段式设计清晰
- Judge 评审模型与主模型分离的架构正确
- 多候选（multi-candidate）+ session 去重的设计周到

**问题**：
- **Provider 切换粒度不够**：spec 定义 provider 是全局配置，但实际应支持 per-skill provider（Judge 用便宜模型，续写用强模型）
- **流式 abort 语义不明**：spec 说"需要 abort 能力"但没定义 abort 后的已接收内容如何处理（丢弃？保留？）
- **rate-limiting RFC 是 DRAFT**：速率限制只有草案没有实现规划，这在 V1 就是风险

### 3.2 Context Engine（411 行）— ★★★☆☆

**优点**：
- 4 层架构概念清晰（Rules / Settings / Retrieved / Immediate）
- Singleflight Cache + Stable Prefix Hash 是成熟的优化思路

**问题**：
- **Token Budget 估算的中文偏差**（已在 07-TRANSFERABLE 中指出）
- **DEFAULT_TOTAL_BUDGET_TOKENS = 6000 过低**：长篇小说上下文仅 6K tokens 远远不够。CC 的 context window 利用率远高于此
- **Fetcher 接口未定义**：说"外部 Fetcher 提供"但没有 Fetcher 接口契约
- **与 AI Service 的 prompt 结构不对齐**：Context Engine 输出的 4 层如何映射到 AI Service 的 SystemPromptTemplate？没有定义

### 3.3 IPC（532 行）— ★★★★★

**最佳模块。** Schema-first Contract + Zod 校验 + 3 种通信模式 + 代码生成 + CI 门禁验证。这是整个 OpenSpec 中设计最成熟的模块，可以直接当最佳实践参考。

**唯一建议**：增加 IPC 通道的 **性能 SLA 定义**（p95 延迟阈值），目前只在各模块的 NFR 中零散定义。

### 3.4 Editor（766 行）— ★★★★☆

**优点**：
- TipTap 2 集成完整（toolbar / bubble menu / zen mode / autosave）
- AI 协作 Inline Diff 设计周到（逐块接受/拒绝 + selectionTextHash 冲突保护）
- Zen Mode 复用真实编辑器实例（不是只读快照）——正确决策

**问题**：
- **Outline 功能过度**：支持多选 + 拖拽重排 + 行内重命名 + 键盘导航完整覆盖。V1 只需导航功能
- **与 Version Control 的 Diff 组件复用关系不清晰**：Editor 定义了 `DiffViewPanel` / `MultiVersionCompare`，Version Control 说"复用"——但谁拥有这些组件？

### 3.5 Workbench（781 行）— ★★★★☆

**优点**：
- 三栏布局 + Icon Bar + 拖拽面板 + 命令面板的设计完备
- API Key 加密存储（Electron safeStorage）安全设计正确
- 全局异常兜底（installGlobalErrorHandlers）设计成熟

**问题**：
- **Quality Panel** 在 spec 标题中提及但没有展开定义
- **设置面板**只定义了 AI 配置区，但应该包含更多设置项（编辑器字体、主题、快捷键等）
- **i18n 审计工件**的要求过于前瞻，V1 只需基础 i18n 支持

### 3.6 Document Management（480 行）— ★★★☆☆

**优点**：
- 文档类型（chapter/note/setting/timeline/character）分类合理
- 导出格式覆盖（MD/TXT/PDF/DOCX）实用

**问题**：
- **与 Editor 的职责边界模糊**：Editor spec 定义了 `file:document:read/save/create` IPC 通道，Document Management spec 也定义了类似通道——谁是 owner？
- **文件树拖拽重排**过度设计：V1 只需线性列表
- **5MB 文件大小限制**的关联影响未评估（Version Control 的快照大小、Search & Retrieval 的索引大小）

### 3.7 Version Control（378 行）— ★★★☆☆

**问题已在"缺陷 D"中详述。** V1 不需要分支管理。

### 3.8 Knowledge Graph（438 行）— ★★★☆☆

**优点**：
- 5 种实体类型 + 关系管理的数据模型对创作有价值
- 自动识别（LLM auto-recognition）是杀手级功能

**问题**：
- **Force-Directed 可视化**在 V1 是成本极高的功能（需要 Canvas/WebGL 渲染 + 物理引擎），建议 V1 用简单列表/树视图
- **50K 节点限制**暗示考虑了超大规模，但 V1 项目的实际规模可能只有 50-200 个实体
- **自动识别的准确性未定义验收标准**：LLM 识别出的实体是否正确？用户如何修正错误识别？

### 3.9 Memory System（672 行）— ★★★☆☆

**最长的 spec，也是最过度设计的模块之一。**

**问题已在 06-CN-CURRENT-STATE 审计中详述。** 补充要点：
- **Decay Formula `exp(-0.1 × ageInDays)`** 的参数 0.1 是凭感觉定的还是有数据支撑？
- **3 层记忆（Working/Episodic/Semantic）** 的分层逻辑要求精确的 LLM 分类——如果分类错误（将 episodic 误分为 semantic），系统如何自纠？
- **Distillation Pipeline（50 episodes batch trigger）** 如果 50 条 episode 中有 3 条分类错误，distill 结果会放大错误

### 3.10 Skill System（551 行）— ★★★☆☆

**问题已在 06-CN-CURRENT-STATE 审计中详述。** 补充：
- **Output Validation 的膨胀阈值（10x strict / 20x loose）** 对创意写作过于死板。"帮我扩写这段话"→ 20x 膨胀是合理的写作行为
- **FIFO 调度 + session concurrency=1** 意味着所有 AI 操作是严格串行的——无法实现"同时生成 3 个续写方案"

### 3.11 Search & Retrieval（376 行）— ★★★☆☆

**优点**：
- 两阶段召回 + 融合重排的排序可解释性设计优秀
- 搜索替换的全项目预览 + 版本快照保护设计周到

**问题**：
- **向量嵌入在本地 Electron 应用中的实用性存疑**：需要本地模型（资源消耗大）或 API 调用（成本高）
- **RAG 对于创意写作的必要性需要验证**：与代码检索不同，创作者可能更倾向于手动选择参考材料
- **V1 用 SQLite FTS5 完全够用**

### 3.12 Project Management（436 行）— ★★★★☆

**优点**：
- AI 辅助创建项目的设计有意（用自然语言描述生成项目结构）
- 项目生命周期状态机（active → archived → deleted）设计完整
- ProjectLifecycle 的 unbind/bind 串行化设计正确

**问题**：
- **active → deleted 禁止** 的约束可能增加用户操作步骤（先归档再删除）
- **同名项目冲突** 的处理策略未定义（允许同名？自动后缀？）
- **模板系统** 在 scope 中提到但 spec 中未展开

### 3.13 Design System（208 行）— ★★★☆☆

**优点**：
- Token 命名规范详细、Tailwind v4 桥接方法正确
- Typography 预设清单完整

**问题**：
- **3 层 Token 架构**（源文件层 → 运行时层 → 桥接层）对 V1 过于复杂。一个 tokens.css + @theme inline 即可
- **Guard 测试**要求自动验证两个 CSS 文件同步——V1 开发成本过高
- **所有文件状态为 "planned"**——设计系统应该是最先实现的基础设施

### 3.14 Cross-Module Integration（254 行）— ★★☆☆☆

**最弱的 spec。** 只有 254 行，仅列举了数据流方向（Editor ↔ Memory、KG ↔ Context），没有定义：
- 模块间的调用序列和依赖关系
- 错误传播策略（A 模块失败时 B 模块是否降级）
- 数据格式转换规则

### 3.15 Rate Limiting RFC（90 行）— ★★★☆☆

**作为 RFC 质量不错**（有现状分析、候选策略对比、推荐方案），但状态是 DRAFT，没有实现计划。V1 上线前必须至少实现 Service 层的 Token Bucket。

---

## 四、架构建议总结

### 4.1 V1 必须新增的

| 新增 | 原因 |
|------|------|
| **Orchestration Spec** | 定义 AI 写作全链路编排器，解决模块间的"真空地带" |
| **Context Fetcher 接口契约** | 让 Context Engine 与 RAG/Memory/KG 有明确的数据交换格式 |
| **跨模块操作的事务策略** | 定义"部分成功"的处理方式 |

### 4.2 V1 必须简化的

| 模块 | 简化方向 |
|------|----------|
| Version Control | 砍掉分支管理，只做线性快照 + 回滚 |
| Memory System | 只做 Working Memory (in-memory) + 简单的项目级偏好存储 |
| Knowledge Graph | 砍掉图可视化和自动识别，只做 CRUD + 列表展示 |
| Search & Retrieval | 只做 FTS5 全文检索，向量嵌入和 RAG 留到 V2 |
| Skill System | 砍掉自定义 skill 协议和依赖图调度 |
| Design System | 合并为单层（tokens.css + @theme inline） |
| Outline | 砍掉多选、拖拽重排、行内重命名 |

### 4.3 V1 架构优先级

```
第 1 层（基础设施）：IPC 契约 + Design System + Workbench 布局
第 2 层（核心编辑）：Editor + Document Management + 简化版 Version Control
第 3 层（AI 核心）：Orchestration + AI Service + 简化版 Context Engine + 简化版 Skill System
第 4 层（增强功能）：简化版 KG + 简化版 Memory + FTS5 Search
第 5 层（体验优化）：Project Management 全功能 + 命令面板 + 主题切换
```
