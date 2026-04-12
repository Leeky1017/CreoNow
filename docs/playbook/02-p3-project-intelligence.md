# P3：项目智能 — 多文档 + KG + Memory

> 阶段状态：🟡 60%（基础设施存在，智能管线未连通）
>
> 本文件定义 P3 阶段的全部任务。每个任务足够具体，可直接转为 GitHub Issue。

---

## 目标验收场景

用户创建项目 → 添加多个文档 → 创建角色/地点/阵营 → KG 展示关系 → AI 写作时自动注入角色性格+关系+伏笔 → FTS 搜索项目内容 → Memory 记住用户偏好。

**一句话**：从「单文档写作」跃迁到「项目级智能创作」，AI 能理解你的整个小说世界。

---

## 进入条件

P1 退出条件全部满足：

- [x] 闭环 Demo 可运行
- [x] INV-1~INV-4(L0), INV-6, INV-7, INV-9, INV-10 合规
- [x] 所有 P1 模块 ≥ 7/10
- [x] CI 全绿

---

## 任务列表

### TASK-P3-01: KG 自动实体检测替换 Mock Recognizer

- **文件**：`apps/desktop/main/src/services/kg/`
- **问题**：当前使用 mock recognizer 做实体识别——无法检测文本中的角色/地点/事件，导致 KG 无法自动增长
- **方案对比**：

  | 方案 | 优点 | 缺点 | 推荐 |
  |------|------|------|------|
  | A: 纯 LLM Skill | 精度高，能识别隐含实体 | 慢（500ms+），有成本 | 补充用 |
  | B: Aho-Corasick 字典匹配 | 快（< 5ms），无成本 | 只能匹配已知实体 | ✅ 主路径 |
  | A+B 混合 | 覆盖全面 | 实现复杂度高 | 最终目标 |

- **推荐实现**：
  1. **主路径（Aho-Corasick）**：用 KG 中已有实体名构建字典，快速匹配文本中的已知实体
  2. **补充路径（LLM Skill）**：通过 INV-8 post-writing hook 异步执行，发现新实体候选
  3. 新实体候选需人工确认后入 KG（INV-1 精神：用户对数据有最终控制权）
- **INV**：INV-6（LLM 部分作为 Skill 注册），INV-8（hook 触发）
- **规模**：L

---

### TASK-P3-02: KG Aho-Corasick Trie 缓存

- **文件**：`apps/desktop/main/src/services/kg/`
- **问题**：当前每次查询都重建 Aho-Corasick trie，1000 实体时性能不可接受
- **修复**：
  1. 首次 `matchEntitiesCached()` 调用时惰性构建 trie → 以 `Map<projectId, CachedAutomaton>` 缓存到内存
  2. 实体 CRUD 操作后调用 `trieCacheInvalidate(projectId)` 清除该项目缓存；下次读取时惰性重建（invalidation + lazy rebuild）
  3. 暴露 `trieCacheInvalidate()` 供测试使用
  - **设计决策**：选择 invalidation + lazy rebuild 而非增量更新，原因是 Aho-Corasick failure link 重算为 O(total_states)，与全量重建同阶；而实体 CRUD 是低频用户操作，trie 读取是高频热路径，惰性重建的摊销开销可忽略。详见 `trieCache.ts` 头部注释。
- **性能目标**：
  - 1000 实体 trie 全量构建：< 50ms
  - 单次文本匹配（10,000 字）：< 5ms
  - cache invalidation + lazy rebuild 完整周期（1000 实体）：< 50ms
- **测试**：benchmark 测试验证性能目标；并发安全测试（INV-2）
- **依赖**：TASK-P3-01（需要 Aho-Corasick 匹配器先实现）
- **规模**：M

---

### TASK-P3-03: Post-Writing Hook 全链路激活

- **文件**：`apps/desktop/main/src/core/skillOrchestrator.ts` Stage 8
- **当前状态**：仅 cost-tracking + auto-save-version 两个 hook 启用
- **目标全链路**（按执行顺序）：

  | 顺序 | Hook | 职责 | 实现路径 |
  |------|------|------|---------|
  | 1 | `version-snapshot` | 写入前创建版本快照 | ✅ 已实现 |
  | 2 | `kg-update` | Aho-Corasick 匹配已知实体 + 标记新候选实体 | 依赖 TASK-P3-01 |
  | 3 | `memory-extract` | 从写作内容提取用户偏好/风格片段 → Memory L1 | 依赖 TASK-P3-04 |
  | 4 | `quality-check` | `consistency-check` Skill 对比 KG 状态与新文本 | 依赖 TASK-P3-07 |
  | 5 | `cost-tracking` | 记录 AI 调用成本 | ✅ 已实现 |

- **设计约束**：
  - 每个 hook 独立失败不阻塞后续 hook（错误记录但不中断链路）
  - hook 总执行时间预算：< 2s（kg-update + memory-extract 可异步）
  - Hook 注册采用优先级排序，支持动态添加
- **INV**：INV-8
- **规模**：M-L

---

### TASK-P3-04: Memory Layer 1 实现

- **文件**：`apps/desktop/main/src/services/memory/`
- **当前状态**：
  - L0（user_memory 表）：简单 CRUD ✅
  - L2（KG + FTS5）：主检索路径 ✅
  - L1（session-aware / daily journal）：❌ 未实现
- **目标**：实现 L1——per-session 上下文记忆
- **存储内容**：
  - 当次写作会话中用户使用的风格（正式/口语/抒情…）
  - 用户提到的参考资料、人名、地名
  - 排版偏好（段落长度、对话格式、视角切换频率）
  - 会话级别的临时笔记（用户主动记录）
- **注入策略**：
  - SkillOrchestrator 上下文组装阶段（Stage 3），按相关性评分选择性注入 L1 内容
  - 相关性评分：FTS5 关键词匹配 + 时间衰减（越近的 session 权重越高）
  - 注入上限：L1 内容不超过总 context budget 的 15%
- **数据模型**：
  ```
  session_memory {
    id, session_id, project_id,
    category: 'style' | 'reference' | 'preference' | 'note',
    content: text,
    relevance_score: float,
    created_at, expires_at
  }
  ```
- **INV**：INV-4
- **规模**：M-L

---

### TASK-P3-05: INV-5 叙事压缩（AutoCompact）

- **文件**：`apps/desktop/main/src/services/ai/compact/narrativeCompact.ts`
- **当前状态**：仅占位，无实际逻辑
- **目标**：当上下文超预算时，自动压缩低优先级内容
- **保护规则**（`compactable: false`）：
  - KG 核心实体定义（角色设定、阵营关系）
  - 未解伏笔（foreshadowing entities）
  - 世界规则（magic system、法律、物理规则）
  - 用户标记为「重要」的段落
- **压缩策略**：
  1. 按优先级排序上下文片段：`protected > recent > referenced > old`
  2. 从最低优先级开始，调用 LLM Skill 生成摘要
  3. 摘要替换原文，但保留引用指针（可点击展开原文）
  4. 压缩结果缓存，相同内容不重复压缩
- **实现约束**：
  - 压缩操作本身是 INV-6 合规的 Skill（`builtin:auto-compact`）
  - 压缩结果不写回原文档——仅影响上下文注入
  - 压缩日志记录到 `skill_executions` 表（INV-9）
- **INV**：INV-5
- **规模**：L

---

### TASK-P3-06: 项目上下文重绑定

- **文件**：`apps/desktop/main/src/ipc/project.ts`
- **问题**：切换项目时，所有上下文服务（KG、Memory、FTS scope）需要重新绑定到新项目——当前未实现此切换逻辑
- **修复**：
  1. `project:switch` IPC 触发以下重绑定序列：
     - Context Engine：重建 project-scoped 上下文窗口
     - KG scope：切换到目标项目的 entity/relation 集合，重建 Aho-Corasick trie
     - Memory scope：切换 L0 查询范围 + 清空 L1 session 缓存
     - FTS scope：设置 FTS5 查询的 project_id 过滤
  2. 切换过程中 UI 显示 loading 状态，禁止并发切换
  3. 切换失败时回滚到上一个项目上下文
- **测试**：
  - 切换项目后，AI 写作注入的是新项目的 KG 实体
  - 切换项目后，FTS 搜索只返回新项目的结果
  - 并发切换被正确拒绝（INV-2）
- **INV**：INV-2（并发安全）
- **规模**：M

---

### TASK-P3-07: 3 个 P3 Skill 实现

P3 阶段需要的 3 个核心 Skill：

#### 7a: `builtin:consistency-check`

- **触发时机**：段落完成后（post-writing hook）
- **功能**：比对当前段落与 KG 数据，检测矛盾
  - 时间线矛盾（角色在 A 地点却出现在 B 的对话中）
  - 角色属性矛盾（蓝眼睛变成了绿眼睛）
  - 已知事实矛盾（法术规则、物理规则违背）
- **输出**：矛盾列表 + 严重程度 + 建议修改
- **数据源**：KG entities + relations + document context
- **约束**：作为 INV-6 合规 Skill 注册；单次检查 ≤ 3s

#### 7b: `builtin:dialogue-gen`

- **功能**：基于角色 KG 性格 + 关系生成对话
- **输入**：场景描述 + 参与角色 ID 列表 + 对话目的
- **上下文注入**：角色性格描述（KG）+ 角色间关系（KG）+ 最近对话历史（Memory L1）
- **约束**：生成的对话必须符合角色已建立的说话风格

#### 7c: `builtin:outline-expand`

- **功能**：大纲节点展开为详细段落
- **输入**：大纲节点文本 + 上下文（前后章节摘要）
- **上下文注入**：KG 世界设定 + 活跃伏笔 + 角色当前状态
- **约束**：展开内容不得引入 KG 中不存在的新角色/地点（除非明确标记为「新引入」）

- **INV**：INV-6（全部作为 Skill 注册）
- **规模**：L（3 个 Skill 合计）

---

### TASK-P3-08: 故事状态摘要服务

- **文件**：`apps/desktop/main/src/services/engagement/storyStatusService.ts`（新建）
- **功能**：打开项目时，首页展示当前创作状态摘要
- **展示内容**：
  - 当前章节进度（第 X 章 / 共 Y 章）
  - 中断任务（上次写到哪里、最后编辑的段落）
  - 活跃伏笔列表（KG 中 `type=foreshadowing` 且未解决的实体）
  - 建议下一步操作（基于中断点 + 大纲进度推断）
- **数据源**：
  - `documents` 表：章节列表 + 最后编辑时间
  - `kg_entities` 表：foreshadowing entities（未解决）
  - `user_memory`（L0）表：用户偏好
- **性能约束**：
  - 响应时间 ≤ 200ms
  - 纯结构化查询（SQL + KG 遍历），**禁止 LLM 调用**
  - 结果缓存 30s，文档变更时失效
- **INV**：INV-4（Memory-First：优先从结构化数据获取信息）
- **规模**：M

---

## 任务依赖图

```
TASK-P3-01 (KG Recognizer)
    └── TASK-P3-02 (Trie 缓存)
    └── TASK-P3-03 (Hook 全链路) ← 也依赖 P3-04, P3-07
                                    │
TASK-P3-04 (Memory L1)              │
    └── TASK-P3-03 (Hook: memory-extract)
                                    │
TASK-P3-07 (3 Skill)                │
    └── TASK-P3-03 (Hook: quality-check)

TASK-P3-05 (AutoCompact)      ← 独立（但建议在 L1 之后）
TASK-P3-06 (项目切换)          ← 独立（但建议在 P3-01/02 之后）
TASK-P3-08 (故事摘要)          ← 独立（依赖 KG 数据存在）
```

**推荐执行顺序**：
1. TASK-P3-01（KG Recognizer，解除核心阻塞）
2. TASK-P3-02（Trie 缓存，紧跟 P3-01）
3. TASK-P3-04（Memory L1，独立开发）
4. TASK-P3-07（3 Skill，可与 P3-04 并行）
5. TASK-P3-03（Hook 全链路，等 P3-01/04/07 就绪后串联）
6. TASK-P3-06（项目切换）
7. TASK-P3-05（AutoCompact，P3 后期或 P4 初期）
8. TASK-P3-08（故事摘要，可穿插）

---

## 退出条件

全部满足才可进入 P4+：

- [ ] 多文档项目 CRUD 完整
- [ ] KG 角色/地点列表可查看 + 手动创建 + 自动检测
- [ ] AI 写作注入 KG 上下文（角色性格、关系、伏笔）
- [ ] FTS5 项目范围搜索可用
- [ ] Memory L0 + L1 可用
- [ ] INV-1~INV-10 全部合规（INV-5 AutoCompact 至少基础版本）
- [ ] Post-writing hook 全链路运行
- [ ] 所有 P3 模块评分 ≥ 7/10
- [ ] CI 全绿：typecheck + lint + test + contract:check

---

## 参考文档

- 架构总纲：`ARCHITECTURE.md`
- Agent 宪法：`AGENTS.md`
- 后端质量评估：`docs/references/backend-quality-assessment.md`
- KG Spec：`openspec/specs/knowledge-graph/spec.md`
- Memory Spec：`openspec/specs/memory-system/spec.md`
- Skill Spec：`openspec/specs/skill-system/spec.md`
- Context Engine Spec：`openspec/specs/context-engine/spec.md`
- 成瘾引擎（故事摘要相关）：`docs/references/engagement-engine.md`
- 测试指南：`docs/references/testing-guide.md`
