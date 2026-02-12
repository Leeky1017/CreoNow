# Phase 1 Agent 指令：AI 可用

> 本指令用于指导 Agent 完成 Phase 1 的 spec 编写和 4 个 change 的创建。
> Agent 在执行前必须先阅读 `AGENTS.md`。

---

## 你的身份

你是 CreoNow 的开发 Agent。你的任务是为 Phase 1（AI 可用）编写 4 个 OpenSpec change 的 delta spec 和 tasks.md，然后按 TDD 流程实现。

---

## 必读文件（按顺序）

1. `AGENTS.md` — Agent 宪法，理解所有规则和禁止行为
2. `openspec/project.md` — 项目概述和模块索引
3. `docs/plans/audit-roadmap.md` — 完整路线图，理解 Phase 1 的 4 个 change 的 scope 和 scenario
4. 以下 spec 文件（Phase 1 涉及的模块）：
   - `openspec/specs/ai-service/spec.md` — Change 1, 3 的目标 spec
   - `openspec/specs/skill-system/spec.md` — Change 2 的目标 spec
   - `openspec/specs/workbench/spec.md` — Change 4 的目标 spec
5. 以下审计报告（理解问题背景和建议方案）：
   - `docs/audit/01-system-prompt-and-identity.md` — §3.1 身份提示词、§3.2 组装链、§3.3 技能
   - `docs/audit/02-conversation-and-context.md` — §3.1 消息数组、§3.2 多轮组装
   - `docs/audit/06-onboarding-ux-config.md` — §3.1 API Key 配置
6. 以下代码文件（理解现有实现）：
   - `apps/desktop/main/src/services/ai/` — AI 服务现状
   - `apps/desktop/main/src/services/skill/` — 技能系统现状
   - `apps/desktop/renderer/src/stores/aiStore.ts` — AI store 现状

---

## 任务：按顺序执行

### Step 1：创建 4 个 Change 的 GitHub Issue

为每个 change 创建 Issue，标题格式 `[Phase1] <change描述>`：

1. `[Phase1] AI 身份提示词与分层组装` — 对应 Change 1 `ai-identity-prompt`
2. `[Phase1] Chat 技能与智能路由` — 对应 Change 2 `chat-skill`
3. `[Phase1] 多轮对话消息管理` — 对应 Change 3 `multi-turn-conversation`
4. `[Phase1] API Key 配置与 AI 设置面板` — 对应 Change 4 `api-key-settings`

### Step 2：为每个 Change 编写 Delta Spec

对每个 change，创建：

```
openspec/changes/<change-id>/
├── proposal.md    ← delta spec
└── tasks.md       ← TDD 六段式
```

**proposal.md 格式**：

```markdown
# Change: <change-id>

## 目标 Spec
`openspec/specs/<module>/spec.md`

## Delta

### [ADDED] <新增的 Requirement ID>
<requirement 描述>

### [ADDED] Scenario: <scenario 标题>
GIVEN <前提条件>
WHEN <触发动作>
THEN <期望结果>

### [MODIFIED] <已有 Requirement ID>（如有修改）
<修改内容，标明 before/after>
```

**tasks.md 必须包含固定六段**：
1. Specification — 引用 proposal.md 中的 requirements 和 scenarios
2. TDD Mapping — 每个 scenario 映射到至少一个测试用例
3. Red — 先写失败测试，记录失败证据
4. Green — 最小实现通过测试
5. Refactor — 保持绿灯下重构
6. Evidence — 测试通过截图/日志

### Step 3：按 TDD 实现

对每个 change，从 `origin/main` 创建 `task/<N>-<slug>` 分支，执行 Red → Green → Refactor 循环。

### Step 4：创建 PR 并合并

每个 change 一个 PR，PR 描述包含 `Closes #<N>`。启用 auto-merge。

---

## 4 个 Change 的详细 Scenario（从 audit-roadmap.md 提取）

### Change 1: `ai-identity-prompt`

需要在 `ai-service/spec.md` 中新增：

- **REQ-AIS-IDENTITY**: AI 服务必须支持全局身份提示词模板，包含写作素养（blocking、POV、节奏、Show don't tell）和角色流动（ghostwriter/muse/editor/actor/painter）定义
- **REQ-AIS-ASSEMBLY**: 系统提示词必须按分层顺序组装：身份 → 用户规则 → 技能指令 → 模式 → 记忆 → 上下文
- **Scenario**: GIVEN AI 服务启动 WHEN 组装系统提示词 THEN 身份层始终包含写作素养和角色流动定义
- **Scenario**: GIVEN 技能指定了 system prompt WHEN 组装系统提示词 THEN 技能 prompt 插入到身份层之后、上下文层之前
- **Scenario**: GIVEN 用户有记忆偏好 WHEN 组装系统提示词 THEN 记忆层注入到上下文层之前

### Change 2: `chat-skill`

需要在 `skill-system/spec.md` 中新增：

- **REQ-SKL-CHAT**: 技能系统必须包含 chat 技能，用于自由对话和问答
- **REQ-SKL-ROUTE**: 技能系统必须支持基础意图路由，根据用户输入推断技能
- **Scenario**: GIVEN 用户发送自由文本 WHEN 未显式指定技能 THEN 默认使用 chat 技能
- **Scenario**: GIVEN 用户输入包含"续写"关键词 WHEN 技能路由分析 THEN 推断为 write 技能
- **Scenario**: GIVEN 用户输入包含"头脑风暴"关键词 WHEN 技能路由分析 THEN 推断为 brainstorm 技能

### Change 3: `multi-turn-conversation`

需要在 `ai-service/spec.md` 中新增：

- **REQ-AIS-MESSAGES**: AI 服务必须维护对话消息数组，支持 add/clear/trim 操作
- **REQ-AIS-MULTITURN**: LLM 调用必须包含历史消息，按 system + history + current 顺序组装
- **Scenario**: GIVEN 用户发送第 N 条消息 WHEN LLM 调用 THEN 请求包含前 N-1 条历史消息
- **Scenario**: GIVEN 历史消息总 token 超过预算 WHEN 组装消息 THEN 从最早的非系统消息开始裁剪
- **Scenario**: GIVEN 用户切换文档 WHEN 对话上下文 THEN 清空历史消息

### Change 4: `api-key-settings`

需要在 `workbench/spec.md` 中新增：

- **REQ-WB-AICONFIG**: 设置面板必须包含 AI 配置区，支持 API Key 输入、模型选择、连接测试
- **REQ-WB-KEYSAFE**: API Key 必须通过 Electron safeStorage 安全存储
- **Scenario**: GIVEN 用户打开设置 WHEN 进入 AI 配置区 THEN 显示 API Key 输入框和模型选择
- **Scenario**: GIVEN 用户输入 API Key WHEN 点击测试连接 THEN 发送测试请求并显示成功/失败
- **Scenario**: GIVEN 无可用 API Key WHEN 用户尝试使用 AI 功能 THEN 显示配置引导而非报错

---

## 约束

- 禁止跳过 spec 直接写代码
- 禁止先写实现再补测试
- 禁止消耗真实 LLM API 额度（测试必须 mock）
- 每个 change 的 `tasks.md` 必须包含 Red 失败证据
- 当 4 个 change 同时活跃时，必须维护 `openspec/changes/EXECUTION_ORDER.md`
