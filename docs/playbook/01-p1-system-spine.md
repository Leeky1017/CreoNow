# P1：系统脊柱 — 闭环 Demo

> 阶段状态：🟡 80%
>
> 本文件定义 P1 阶段的全部剩余任务。每个任务足够具体，可直接转为 GitHub Issue。

---

## 目标验收场景

用户打开 CN → 选中文本 → 触发「润色」Skill → 预览 Diff → 确认变更 → 版本快照自动创建 → 可撤销到任意版本。

**一句话**：从「选文」到「可撤销」的完整闭环，证明 Skill 管线端到端可用。

---

## 进入条件

当前处于此阶段。

---

## 任务列表

### TASK-P1-01: 修复 INV-3 tokenBudget.ts 4:1 公式

- **文件**：`packages/shared/tokenBudget.ts`
- **问题**：使用 `UTF8_BYTES / 4` 统一估算 token 数，违反 INV-3（禁止此公式）
- **修复**：引入 CJK 判断逻辑，中文按 ~1.5 tokens/字估算，英文按 ~0.75 tokens/word
- **参考实现**：`apps/desktop/main/src/services/context/tokenEstimation.ts`（已正确实现，可复用逻辑）
- **测试**：`tokenBudget.test.ts` 覆盖纯中文、纯英文、中英混合三种场景
- **INV**：INV-3
- **规模**：S（< 100 行改动）

---

### TASK-P1-02: INV-6 合规 — AI IPC 走 Skill 系统

- **文件**：
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/aiProxy.ts`
- **问题**：IPC handler 直接调用 AI Service，绕过 SkillOrchestrator，违反 INV-6（一切皆 Skill）和 INV-7（统一入口）
- **修复**：
  1. IPC handler 调用 `SkillOrchestrator.execute()` 而非直接调用 AI Service
  2. AI Service 仅通过 Skill 定义暴露给外部（`builtin:polish`, `builtin:chat` 等）
  3. 保留 AI Service 作为 Skill 的内部实现依赖（Skill → AI Service → Provider）
- **依赖**：TASK-P1-04（Skill Manifest Loader 必须先激活，否则内置 Skill 无法注册）
- **线索**：`apps/desktop/main/src/core/skillOrchestrator.ts` 已有完整 9 阶段 pipeline
- **测试**：IPC 调用 → 确认经过 SkillOrchestrator → mock AI 返回 → 验证 Diff 格式
- **INV**：INV-6, INV-7
- **规模**：M（涉及 IPC 层重构 + Skill 注册）

---

### TASK-P1-03: INV-6 合规 — KG IPC 走 Skill 系统

- **文件**：`apps/desktop/main/src/ipc/knowledgeGraph.ts`
- **问题**：KG 操作直接调用 Service，绕过 Skill 系统
- **修复**：
  - KG **读操作**可直接调用 Service（只读无副作用，不需要 Permission Gate）
  - KG **写操作**（创建实体、修改关系、删除实体）必须走 Skill 系统
  - 新建 `builtin:kg-mutate` Skill 封装 KG 写操作
- **边界决策**：读操作豁免 INV-6 的依据——INV-6 的核心关切是「写操作必须经 Permission Gate + 版本快照」，只读查询无此风险
- **INV**：INV-6
- **规模**：M

---

### TASK-P1-04: 激活 Skill Manifest Loader

- **文件**：`apps/desktop/main/src/services/skills/`
- **问题**：SKILL.md 解析器已编写但从未被调用——新 Skill 无法动态注册，导致 Skill 系统形同虚设
- **修复**：
  1. 在应用启动阶段调用 Manifest Loader 扫描内置 Skill 目录
  2. 解析 SKILL.md → 注册到 SkillOrchestrator
  3. 确保至少 3 个内置 Skill 可用：`builtin:polish`（润色）、`builtin:chat`（对话）、`builtin:continue`（续写）
- **测试**：启动后 `SkillOrchestrator.listSkills()` 返回 ≥ 3 个内置 Skill；每个 Skill 有完整 schema
- **INV**：INV-6
- **规模**：S-M
- **阻塞**：TASK-P1-02 和 TASK-P1-03 依赖此任务

---

### TASK-P1-05: 修复 Skill 写回路径歧义

- **问题**：两个文件都声称负责"AI 输出写回文档"，逻辑冲突——写回路径不明确可能导致数据丢失或重复写入
- **修复**：
  1. 确定唯一写回路径：SkillOrchestrator Stage 7（write-back）→ Version Control snapshot → Document update
  2. 删除冗余代码中的写回逻辑
  3. 写回操作必须经 Permission Gate（INV-1 合规）
- **验证**：追踪一次完整写回流程，确认只有一个代码路径执行实际写入
- **INV**：INV-1（写操作必须经 Permission Gate + 版本快照）
- **规模**：S

---

### TASK-P1-06: 消灭 silent catch blocks

- **文件**：全 `apps/desktop/main/src/` 搜索 `catch.*{}`、`catch.*return null`、`catch.*return undefined`、`catch.*return []`
- **问题**：4+ 模块有 silent catch，错误被静默吞掉，违反 INV-10（错误不丢上下文）
- **修复策略**：
  - 错误要么**重试**（含退避逻辑），要么**上报**（生成 `{ type: "error" }` 事件）
  - 禁止 catch block 中 `return defaultValue` 且不记录错误
- **逐模块修复优先级**：
  1. AI Service（4 处 silent catch）— 影响 Skill pipeline 核心路径
  2. Export — 影响用户可见功能
  3. Skills — 影响 Orchestrator 错误传播
  4. 其他模块
- **测试**：每个修复的 catch block 都要有对应的错误场景测试
- **INV**：INV-10
- **规模**：M（分散在多个文件，但每处改动小）

---

### TASK-P1-07: Editor Backend 集成（IPC 通路）

- **文件**：`apps/desktop/main/src/services/editor/`
- **问题**：当前仅有类型定义，实际编辑逻辑在 Renderer——但 P1 目标不是后端编辑，而是确认闭环通路
- **修复**：P1 阶段**不要求**后端编辑逻辑——确认以下 IPC 通路可走通即可：
  1. Renderer 选中文本 → IPC invoke `skill:execute` 携带 selection + context
  2. Main 进程 SkillOrchestrator 接收 → 组装上下文 → 调用 AI Provider
  3. AI 返回 → Diff 生成 → IPC 返回 Renderer
  4. Renderer 展示 Diff 预览 → 用户确认 → IPC invoke `document:apply-diff`
  5. Main 进程 Version Control 创建快照 → 应用变更 → 返回成功
- **关键路径**：`Renderer selection → IPC → SkillOrchestrator → AI + Context → Diff → IPC → Renderer preview → confirm → IPC → VersionControl + Document update`
- **测试**：E2E 路径测试（mock LLM），验证从 IPC invoke 到最终 document 更新的完整流程
- **INV**：INV-1（版本快照）、INV-6（走 Skill）
- **规模**：M-L（涉及多层 IPC 串联）

---

### TASK-P1-08: INV-9 成本追踪 cachedTokens 传入

- **文件**：`apps/desktop/main/src/core/skillOrchestrator.ts`
- **问题**：调用 costTracker 时 `cachedTokens` 默认为 0，导致成本统计不准确（缓存命中的 token 不应重复计费）
- **修复**：
  1. 从 AI provider 响应中提取 `usage.cached_tokens`（或等效字段）
  2. 传入 costTracker 的 `cachedTokens` 参数
  3. 确保不同 provider（OpenAI / Anthropic / 本地）的字段名映射正确
- **测试**：mock AI 返回含 `cached_tokens` 的 usage → 验证 costTracker 记录正确
- **INV**：INV-9
- **规模**：S

---

## 任务依赖图

```
TASK-P1-04 (Manifest Loader)
    ├── TASK-P1-02 (AI IPC → Skill) ──┐
    └── TASK-P1-03 (KG IPC → Skill)   ├── TASK-P1-07 (E2E 通路)
                                       │
TASK-P1-05 (写回路径) ─────────────────┘

TASK-P1-01 (INV-3 Token)     ← 独立
TASK-P1-06 (silent catch)     ← 独立
TASK-P1-08 (cachedTokens)     ← 独立（但建议在 P1-02 之后，Skill pipeline 稳定后做）
```

**推荐执行顺序**：
1. TASK-P1-01（独立，快速修复）
2. TASK-P1-04（阻塞 P1-02 和 P1-03）
3. TASK-P1-02 + TASK-P1-03（可并行）
4. TASK-P1-05（写回路径，依赖 Skill 系统已通）
5. TASK-P1-06（独立，可穿插）
6. TASK-P1-07（E2E 集成，需要前面全部完成）
7. TASK-P1-08（收尾优化）

---

## 退出条件

全部满足才可进入 P3：

- [ ] 闭环 Demo 可运行：选文 → Skill → Diff → 确认 → 版本
- [ ] INV-1, INV-2, INV-3, INV-4(L0), INV-6, INV-7, INV-9, INV-10 合规
- [ ] 所有 P1 模块评分 ≥ 7/10
- [ ] CI 全绿：typecheck + lint + test + contract:check

---

## 参考文档

- 架构总纲：`ARCHITECTURE.md`
- Agent 宪法：`AGENTS.md`
- 后端质量评估（评分来源）：`docs/references/backend-quality-assessment.md`
- 测试指南：`docs/references/testing-guide.md`
- 测试命令：`docs/references/test-commands.md`
- AI Service Spec：`openspec/specs/ai-service/spec.md`
- Skill System Spec：`openspec/specs/skill-system/spec.md`
- Editor Spec：`openspec/specs/editor/spec.md`
- Version Control Spec：`openspec/specs/version-control/spec.md`
