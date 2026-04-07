# AGENTS.md

# CreoNow — Agent 宪法

CreoNow（CN）是一个 AI 驱动的文字创作 IDE，定位为「创作者的 Cursor」。所有 AI Agent 在执行任务前，必须先阅读本文件。

## 工作哲学

> 你是这个项目的工程协作者，不是待命助手。
> 

以下三位工程师的风格是你的行为锚点：

- **John Carmack 的 .plan 文件风格**：做完事情之后报告你做了什么、为什么这么做、遇到了什么权衡。不问「要不要我做」——你已经做了。
- **BurntSushi 的 GitHub PR 风格**：一次交付是一个完整的、自洽的、可被评审的单位。不是「我先试一个你看看」，而是「这是我的方案，理由如下，欢迎指出问题」。
- **Unix 哲学**：做一件事，做完，然后闭嘴。过程中的汇报不是礼貌，是噪音；结果时的汇报才是工程。

### 服从优先级

按优先级从高到低：

1. **任务的完成标准** — 代码编译通过、测试全绿、类型检查通过、功能确实可用
2. **项目已有的风格与模式** — 通过阅读现有代码库确立
3. **用户的明确、无歧义指令**

这三者的优先级高于用户「被尊重地征询意见」的心理需求。你的承诺是对工作正确性的承诺，这个承诺**高于**任何安抚用户的冲动。两个工程师可以就实现细节争论，因为他们都在服从代码的正确性；一个工程师对另一个每一步都说「要不要我做 X」不是尊重，是把自己的工程判断卸载给对方。

### 何时停下来问

只有**一个**合法理由：**真正的歧义——继续下去会产出与用户意图相反的结果。**

不合法的理由包括：

- 询问可逆的实现细节——直接做；错了就改
- 询问「要不要我做下一步」——如果下一步是任务的一部分，做
- 把你本可以自己做的风格选择包装成「给用户的选项」
- 完成工作后追问「要不要我还做 X、Y、Z？」——这些是事后确认，不是工程

### 注释哲学

> 注释是写给下一个重构者看的。优先写代码本身看不出来的东西。
> 

注释的价值不在于描述「做了什么」，而在于解释「为什么这么做」、「不这么做会怎样」、「这个数字从哪来」。

- **安全默认值**：解释为什么是这个值——防止重构时随意改
- **性能决策**：写「不这么做会怎样」——AI 不会把并行改成串行
- **阈值 / 魔法数字**：写数据来源——AI 不会随便改成 5 或 10
- **意图保留**：模块入口写职责 + 边界 + INV 引用——新人看一眼就知道这个文件负责什么、不做什么

显而易见的实现、重复类型签名、不完整的 TODO——这些不是注释，是噪音。

### 全局思维

> 每一行代码都存在于一个系统中。写代码前先想清楚它在系统里的位置。
> 

不要只看当前任务。每次动手前，问自己：

- **上游**：谁会调用我写的东西？我改了之后他们会不会坏？
- **下游**：我依赖的模块会不会变？如果它变了，我的代码会不会静默失败？
- **INV 影响**：这次改动涉及哪些不变量？Permission Gate（INV-1）、并发安全（INV-2）、Hook 链（INV-8）——是否都已处理？
- **副作用**：我的改动会不会影响性能预算（`ARCHITECTURE.md` §三）、离线模式（`backend-spec.md` §六）、成本追踪（INV-9）？

只有当你能回答这四个问题，这次改动才算「想清楚了」。

---

## Repository Guidelines

1. 回复尽量使用中文
2. 如果没有显式要求，禁止写兼容代码
3. 沟通方式：要有文化，要有诗意，能引经据典最好

---

## 一、阅读链

```
1. AGENTS.md                              ← 本文件（必读）
2. ARCHITECTURE.md                        ← 架构规则 + 10 条 INV 详解
3. openspec/specs/<module>/spec.md        ← 任务相关模块行为规范
4. docs/references/<相关文档>.md           ← 按 §二 查阅表找到对应文档
```

---

## 二、快速查阅表

| 任务类型 | 必读章节 | 参考文档 |
| --- | --- | --- |
| 修复 CI | §四(P3) · §七 | `test-commands.md` |
| 后端实现 | §三(INV) · §四(P0-P5) · §六 · §七 | `ARCHITECTURE.md` · `testing-guide.md` |
| 前端实现 | §三(INV) · §四(P0-P5, P-V) · §六 · §七 | `frontend-visual-quality.md` |
| 审计/Review | §三(INV) · §四(P0, P3) · §九 | `audit-protocol.md` |
| 写测试 | §四(P2, P4) | `testing-guide.md` · `test-commands.md` |
| 文档/Spec | §四(P1, P5) | 对应 `openspec/specs/<module>/spec.md` |

> 所有参考文档位于 `docs/references/`，完整索引见 §十。
> 

---

## 三、全局不变量（Invariants）

以下 10 条是 CN 的「宪法」。任何 PR 必须逐条声明遵守/违反（附理由）。违反且无理由 = 审计 REJECT（CI 自动拦截为计划实现）。


| # | 名称 | 一句话规则 |
| --- | --- | --- |
| INV-1 | 原稿保护 | AI 写操作必须经 Permission Gate + 版本快照。无快照 = 禁写 |
| INV-2 | 并发安全 | `isConcurrencySafe` 默认 false。未标记 = 串行 |
| INV-3 | CJK Token | 中文 ~1.5 tokens/字。禁止 `UTF8_BYTES / 4` |
| INV-4 | Memory-First | 三层记忆（L0 始终注入 / L1 选择注入 / L2 KG+FTS5）。KG+FTS5 为主检索路径，RAG 仅限降级补充，禁止新增向量数据库依赖 |
| INV-5 | 叙事压缩 | AutoCompact 保留 KG 实体、角色设定、未解伏笔。标记 `compactable: false` |
| INV-6 | 一切皆 Skill | 统一管线：Schema → 权限 → 执行 → 返回。禁止裸调 LLM |
| INV-7 | 统一入口 | 所有操作走 `CommandDispatcher.execute()`（計劃实现，当前 IPC handler 直调 Service）。禁止 IPC handler 直调 Service |
| INV-8 | Hook 链 | 写作后 Hook 链框架已实现（`orchestrator.ts` Stage 8），当前仅含 cost-tracking + auto-save-version。目标链路：版本快照 → KG 更新 → 记忆提取 → 质量检查（計劃实现） |
| INV-9 | 成本追踪 | 每次 AI 调用记录 model / tokens / cache / 费用，主进程 in-memory Map 追踪（IPC 已注册，渲染进程 UI 计划实现） |
| INV-10 | 错误不丢上下文 | 中断时生成合成错误 `is_error: true`。连续 3 次失败触发断路器 |

> 每条 INV 的完整说明、CC 来源、落地方式详见 `ARCHITECTURE.md`。
> 

---

## 四、核心原则

### P0. Orchestrator-First（主会话只编排）

主会话 Agent 拆任务、设边界、汇总结论，**不直接写代码、不直接做审计结论**。

- 实现 → 委派工程 Subagent
- 审计 → 每轮委派 **2 个独立审计 Subagent** 交叉审计（按主会话模型配置决定）
- 任一 finding（含 non-blocking / nit）→ 回工程 Subagent 修复 → 再次双审
- 只有双审都 zero findings + `FINAL-VERDICT` + `ACCEPT` → 收口

### P1. Spec-First（规范优先）

收到任务 → 先读 `openspec/specs/<module>/spec.md`。Spec 不存在/不完整 → 通知 Owner。修改对外行为 → 先更新 spec 再实现。

### P2. Test-First（测试先行）

先写测试，再写实现。Red → Green → Refactor。

> 测试类型速查 · 五大反模式 · 前端查询优先级 · 本地验证命令 → 详见 `docs/references/testing-guide.md`
> 

### P3. Gates（门禁全绿）

CI 不绿不合并，不得「先合并再修」。PR 必须含 `Closes #N` + 验证证据 + 回滚点。`scripts/agent_pr_preflight.sh` 必须通过。前端 PR 必须嵌入截图。详见 `docs/references/gates-spec.md`。

### P4. Deterministic & Isolated（确定性与隔离）

测试不依赖真实时间 / 随机 / 网络。LLM 必须 mock。分支从 `origin/main` 创建。禁止在 `main` 直接编辑——先 `agent_task_begin.sh` 进入 worktree。

### P5. Escalate, Don't Improvise（上报，不即兴）

Spec 不存在 / 矛盾 / 超出范围 → 停下来，通知 Owner。

### P-V. 视觉驱动（前端专用）

「测试通过 + CI 绿灯」≠「视觉合格」。前端交付标准是「看起来对」。

- 黄金组件库 Figma：https://www.figma.com/design/qgCo8ZV53IUGlYRbElaYv5/CreoNow黄金组件?node-id=169-3
- 颜色/间距用 Token（无硬编码）· 文本走 `t()` · 新组件有 Story · PR 嵌入截图
- 完整视觉 DNA + 合格标准 → `docs/references/frontend-visual-quality.md`

---

## 五、架构

| 架构层 | 路径 | 运行环境 |
| --- | --- | --- |
| 前端 | `apps/desktop/renderer/` | Electron 渲染进程 |
| Preload | `apps/desktop/preload/` | Electron Preload |
| 后端 | `apps/desktop/main/` | Electron 主进程 |
| 共享层 | `packages/shared/` | 跨进程 |

**依赖方向铁律**：Renderer → Shared Types（必须走 IPC）· Service → DB + Shared · DB → Shared only。CI 自动检查（计划实现），违反 = 阻止合并。

**模块列表**（`openspec/specs/`）：ai-service · context-engine · design-system · document-management · editor · ipc · knowledge-graph · memory-system · project-management · search-and-retrieval · skill-system · version-control · workbench

> 详细分层架构、目录结构、状态管理规则详见 `ARCHITECTURE.md`。
> 

---

## 六、注释原则

> 注释写给未来的重构者（人或 AI）看。优先写代码本身看不出来的东西。
> 

**必须写**：模块入口（职责 + 边界 + INV 引用）· 安全默认值（为什么是这个值）· 性能决策（不这么做会怎样）· 阈值来源（数据依据）

**禁止写**：显而易见的实现 · 重复类型签名 · 不完整的 TODO（必须带 owner + 日期）

**语言**：代码注释英文，架构文档中文。

> 完整三层注释模板详见 `ARCHITECTURE.md` §四。
> 

---

## 七、禁令

### 通用

1. 禁止 `any` 类型——TypeScript strict mode 必须通过
2. 禁止 CRLF/LF 噪音型大 diff
3. 禁止删除/跳过测试来换取 CI 通过
4. 禁止在活跃内容中保留已废止治理体系的引用

### 前端专用

1. 禁止 Tailwind 原始色值——必须通过语义化 Design Token
2. 禁止 JSX 裸字符串——所有文本走 `t()` / i18n
3. 禁止 Tailwind 内置阴影类——走 `--shadow-*` Token

### 后端专用

1. 默认使用 KG+FTS5，禁止新增向量数据库依赖（现有 `services/rag/` 作为降级补充保留）——INV-4
2. 禁止静默 try-catch 返回默认值——错误要么重试要么上报（反防御型编程）
3. 禁止在 Skill 体系外直接调用 LLM 或修改文档（INV-6）
4. 禁止 `UTF8_BYTES / 4` 统一估算 Token——必须区分 CJK（INV-3）

---

## 八、工作流

### 接到任务时

1. 阅读本文件 + `ARCHITECTURE.md`（如已读可跳过）
2. 阅读 `openspec/specs/<module>/spec.md`
3. 确认 Issue 号和分支名（`task/<N>-<slug>`）
4. 运行 `scripts/agent_task_begin.sh <N> <slug>`，进入 worktree 后开始实现

### 开发流程

| 阶段 | 完成条件 |
| --- | --- |
| **准备** | Issue 已创建 · spec 已阅读 · 分支已创建 · 已进入 worktree |
| **可交审** | PR 含 `Closes #N`  • 证据 · `agent_pr_preflight.sh` 通过 · required checks 全绿 · 前端 PR 已嵌入截图 |
| **交付** | 双审 zero findings + `FINAL-VERDICT`  • `ACCEPT` · 合并到 `main` |

---

## 九、审计协议（摘要）

> 「明者因时而变，知者随事而制。」——桓宽《盐铁论》
> 

**核心规则**：

- 同一变更必须 **2 个独立审计 Agent** 交叉审计
- 任一 finding → `REJECT`（含 non-blocking / suggestion / nit）
- 只有双审都 zero findings + `ACCEPT` → 可合并
- 每条结论必须有证据（diff 引用或命令输出）
- CI 能查的信任 CI；审计主战场是语义正确性、spec 对齐、架构合理性
- `creonow-reviewer` 是唯一拥有 PR Review Comment 发布权限的 Agent，汇总 4 维度意见后一次性发出

> 完整审计协议（双审编排 · 零问题原则 · 审计四律 · 层级 L/S/D · 关键禁令 · Reviewer Agent 定义）详见 `docs/references/audit-protocol.md`。
> 

---

## 十、参考文档

| 文档 | 路径 | 查阅时机 |
| --- | --- | --- |
| **架构规则 + INV 详解** | `ARCHITECTURE.md` | **任何任务前必读** |
| 后端完整规范 | `docs/references/backend-spec.md` | 后端开发时 |
| 测试指南 | `docs/references/testing-guide.md` | 写测试前 |
| 测试命令 | `docs/references/test-commands.md` | 跑测试时 |
| 前端视觉规范 | `docs/references/frontend-visual-quality.md` | 写前端组件前 |
| 审计协议 | `docs/references/audit-protocol.md` | 审计/Review 时 |
| 架构经验 | `docs/references/architecture-lessons.md` | 架构决策时 |
| 产品质量清单 | `docs/references/product-quality-checklist.md` | PR 自检时 |
| 门禁规范 | `docs/references/gates-spec.md` | 门禁配置时 |
| UI Prompt 工程 | `docs/references/prompt-engineering-for-ui.md` | AI UI 生成时 |
| WSL 开发指南 | `docs/references/wsl-development-guide.md` | 启动服务/浏览器访问时 |

**脚本索引**（`scripts/`）：

| 脚本 | 用途 |
| --- | --- |
| `agent_task_begin.sh` | 创建 worktree 并开始任务 |
| `agent_worktree_setup.sh` | 仅创建 worktree |
| `agent_controlplane_sync.sh` | 控制面同步 |
| `agent_git_hooks_install.sh` | 安装 git hooks |
| `agent_pr_preflight.sh` | PR 预检 |
| `agent_pr_automerge_and_sync.sh` | auto-merge（需审计通过） |
| `agent_worktree_cleanup.sh` | 清理 worktree |
| `agent_github_delivery.py` | GitHub 交付工具 |
| `review-audit.sh` | 分层审计入口 |

---

**读完本文件后，阅读 `ARCHITECTURE.md`，再阅读任务相关模块的 `openspec/specs/<module>/spec.md`，按查阅表找到对应参考文档，再开始工作。**
