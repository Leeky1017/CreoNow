# CreoNow — Agent 宪法 v3

**CreoNow（CN）** 是一个 AI 驱动的文字创作 IDE，定位为「创作者的 Cursor」。

所有 AI Agent 在执行任务前，必须先阅读本文件。

# Repository Guidelines

1. 回复尽量使用中文
2. 如果没有显示要求，禁止写兼容代码
3. 沟通方式：要有文化，要有诗意，能引经据典最好。

---

## 目录

- [零、快速查阅表](#零快速查阅表)
- [一、阅读链](#一阅读链)
- [二、核心原则](#二核心原则)
- [三、架构](#三架构)
- [四、工作流](#四工作流)
- [五、禁令](#五禁令)
- [六、审计协议](#六审计协议)
- [七、参考文档](#七参考文档)

---

## 零、快速查阅表

| 任务类型 | 必读章节 | 参考文档 |
|---------|---------|---------|
| 实现功能 | §一、§二(P0-P4)、§四 | `testing-guide.md`、`test-commands.md` |
| 前端任务 | §一、§二(P0-P4, P-Visual)、§四 | `frontend-visual-quality.md` |
| 审计/Review | §二(P0、P3)、§六 | `audit-protocol.md` |
| 写测试 | §二(P2、P4) | `testing-guide.md`、`test-commands.md` |
| 修复 CI | §二(P3)、§四 | `test-commands.md` |
| 文档/Spec | §二(P1、P5) | 对应 `openspec/specs/<module>/spec.md` |

> 所有参考文档位于 `docs/references/`，完整索引见 [§七](#七参考文档)。

---

## 一、阅读链

```
1. AGENTS.md                              ← 本文件（如已读可跳过）
2. openspec/specs/<module>/spec.md        ← 任务相关模块行为规范
3. docs/references/<相关文档>.md           ← 按 §零 查阅表找到对应文档
```

---

## 二、核心原则

### P0. Orchestrator-First（主会话只编排）

用户的原始指令默认发给主会话 Agent。主会话 Agent 负责拆任务、设边界、汇总结论，**不直接写代码，不直接做审计结论**。

- 实现工作必须委派给工程 Subagent 执行
- 工程 Subagent 必须与主会话 Agent 使用同一模型
- 每一轮实现完成后，主会话 Agent 必须再委派 **2 个独立审计 Subagent** 交叉审计同一变更
- 两个审计 Subagent 必须与主会话 Agent 使用同一模型，且独立出具结论，不得互相代审
- 只要任一审计报告任何问题，主会话 Agent 就必须汇总问题并重新派回工程 Subagent 修复，然后再次发起双审
- 只有当两个审计 Subagent 都达到 zero findings，且分别给出 `FINAL-VERDICT` + `ACCEPT` 时，本轮任务才算收口；任一 finding（含 `non-blocking` / `suggestion` / `nit` / `tiny issue`）都必须继续修复-复审

### P1. Spec-First（规范优先）

收到任务后，第一步阅读 `openspec/specs/<module>/spec.md`。

- Spec 不存在或不完整 → 通知 Owner 补充后再动手
- 开发中发现 spec 遗漏场景 → 先更新 spec 再实现
- 修改模块对外行为 → 必须更新 spec.md
- 修复 bug（行为回归到 spec 定义）→ 不需要更新 spec

### P2. Test-First（测试先行）

先写测试，再写实现。Red → Green → Refactor。详见 `docs/references/testing-guide.md`。

- Spec Scenario 必须有对应测试（`spec-test-mapping-gate` CI 自动验证）
- 测试验证行为，不验证实现细节；测试必须独立、确定、有意义
- Red phase 看到测试因"行为缺失"而失败；Green phase 重新运行确认通过

**测试类型速查**：单函数→单元 | 多模块协作→集成 | 关键用户路径→E2E | 跨层约束→Guard

**五大反模式**：❶ 字符串匹配源码 ❷ 只验证 `toBeTruthy()` ❸ 过度 mock ❹ 仅测 happy path ❺ 无意义测试名

**前端测试查询优先级**：`getByRole` > `getByLabelText` > `getByTestId` >> `getByText`

**本地验证命令**（详见 `docs/references/test-commands.md`）：

```bash
pnpm -C apps/desktop vitest run <pattern>   # 单元/集成测试
pnpm typecheck                               # 类型检查
pnpm lint                                    # ESLint
pnpm -C apps/desktop storybook:build         # Storybook（前端）
```

### P3. Gates（门禁全绿）

- 工程 Agent 只有在 PR 已创建或更新，且正文含 `Closes #N`、验证证据、回滚点、审计门禁，`scripts/agent_pr_preflight.sh` 已通过，required checks（例如 `check` 与仓库分支保护要求）全绿后，才具备“可交审”资格
- 前端改动若未在 PR 正文直接嵌入至少 1 张截图，或未附可点击 Storybook artifact/link（适用时）与视觉验收说明，视为未完成，不得交审
- PR 必须通过 required checks（例如 `check` 与仓库分支保护要求）；auto-merge 默认关闭
- 仅在两个独立审计 Agent 都对 zero findings 的 PR 发布 `FINAL-VERDICT` + `ACCEPT` 后，才可显式开启 auto-merge
- GitHub 远程动作前先运行 `python3 scripts/agent_github_delivery.py capabilities`
- CI 不绿不合并，不得「先合并再修」；交付完成 = 代码已合并到 `main`

### P4. Deterministic & Isolated（确定性与隔离）

- 测试不得依赖真实时间、随机数、网络请求——用 fake timer、固定种子、mock
- LLM 在测试中必须 mock
- 分支从最新 `origin/main` 创建；`pnpm install --frozen-lockfile`
- **禁止**在控制面 `main` 直接编辑——先运行 `scripts/agent_task_begin.sh <N> <slug>` 进入 worktree
- 实现、提 PR、修 CI、回应审计都必须持续在 `.worktrees/issue-<N>-<slug>` 中完成，不得回到控制面根目录“补最后一步”

### P5. Escalate, Don't Improvise（上报，不要即兴发挥）

Spec 不存在/矛盾、任务超出 spec 范围、上游依赖不一致 → 停下来，通知 Owner。

### P-Visual. 视觉驱动（前端任务专用）

> 「测试通过 + CI 绿灯」≠「视觉合格」。前端的交付标准是「看起来对」，不仅是「跑得通」。

**视觉上下文注入（实现前必做）**：详见 `docs/references/frontend-visual-quality.md`（Token 路径、Figma 设计稿、组件复用等完整流程）。

**CreoNow 视觉 DNA**：

| 维度 | 风格 | 关键词 |
|------|------|--------|
| 色温 | 冷灰色调，中性偏冷 | cool gray, neutral |
| 密度 | 紧凑但有呼吸感 | compact, breathable |
| 圆角 | 中等圆角（8px） | rounded-md |
| 动效 | 快速精确 | 0.15–0.2s, ease-out |
| 字体 | Inter(UI) + Lora(正文) + JetBrains Mono(代码) | woff2 |
| 图标 | Lucide 线性，1.5px stroke | thin |
| 留白 | 4px/8px 网格 | 8px rhythm |

**视觉合格标准**：颜色/间距用 Token（无硬编码）| 文本走 `t()` i18n | 交互状态有过渡 | 新组件有 Story | Storybook 可构建 | PR 正文至少直接嵌入 1 张截图 | Storybook artifact/link 可点击。无可见视觉证据的前端 PR，不得视为完成，不得交审。

完整视觉规范详见 `docs/references/frontend-visual-quality.md`。

---

## 三、架构

| 架构层 | 路径 | 运行环境 |
|-------|------|---------|
| 前端 | `apps/desktop/renderer/` | Electron 渲染进程 |
| Preload | `apps/desktop/preload/` | Electron Preload |
| 后端 | `apps/desktop/main/` | Electron 主进程 |
| 共享层 | `packages/shared/` | 跨进程 |

模块列表（`openspec/specs/` 下）：ai-service · context-engine · design-system · document-management · editor · ipc · knowledge-graph · memory-system · project-management · search-and-retrieval · skill-system · version-control · workbench

---

## 四、工作流

### 主会话编排链路

1. 主会话 Agent 只负责拆分任务、指定工程范围、控制循环、综合结论
2. 写代码、改代码、补测试等实现动作，必须交给工程 Subagent
3. 每一轮工程 Subagent 只有在达到“可交审条件”后，主会话 Agent 才可调派 2 个独立审计 Subagent 对同一结果做交叉审计
4. 任一审计 Subagent 发现任何问题，无论严重度或是否标注为 `non-blocking`，都必须回到工程 Subagent 修复，再进入下一轮双审
5. 只有两个审计 Subagent 都 zero findings，且分别给出 `FINAL-VERDICT` + `ACCEPT`，主会话 Agent 才能结束循环并进入交付

审计任务本身也遵循同样原则：主会话 Agent 不直接审计，而是组织双审 Subagent 完成。

### 接到任务时

1. 阅读本文件（如已读可跳过）
2. 阅读 `openspec/specs/<module>/spec.md`
3. 确认 Issue 号和分支名（`task/<N>-<slug>`）
4. 运行 `scripts/agent_task_begin.sh <N> <slug>`，进入 `.worktrees/issue-<N>-<slug>` 后开始实现；后续实现、提 PR、修 CI、回应审计都在该 worktree 中完成

### 开发流程

| 阶段 | 完成条件 |
|------|---------|
| **准备** | Issue 已创建；spec 已阅读/更新；分支已创建；已进入 `.worktrees/issue-<N>-<slug>` |
| **可交审** | 工程 Subagent 已在 `.worktrees/issue-<N>-<slug>` 内完成实现 / 提 PR / 修 CI / 回应审计；PR 已创建或更新（含 `Closes #N`、验证证据、回滚点、审计门禁）；`scripts/agent_pr_preflight.sh` 通过；required checks 全绿；前端改动已在 PR 正文直接嵌入截图，并附可点击 Storybook artifact/link（适用）与视觉验收说明 |
| **交付** | 两名独立审计 Agent 均 zero findings 并给出 `FINAL-VERDICT` + `ACCEPT`；随后方可合并到 `main` |

---

## 五、禁令

1. 禁止 `any` 类型——TypeScript strict mode 必须编译通过
2. 禁止 Tailwind 原始色值——必须通过语义化 Design Token
3. 禁止 JSX 裸字符串——所有文本走 `t()` / i18n
4. 禁止 Tailwind 内置阴影类（`shadow-lg` 等）——走 `--shadow-*` Token
5. 禁止 CRLF/LF 噪音型大 diff——无语义改动却整文件替换
6. 禁止删除/跳过测试来换取 CI 通过
7. 禁止在活跃内容中保留已废止治理体系的引用

---

## 六、审计协议

> 「明者因时而变，知者随事而制。」——桓宽《盐铁论》

适用对象：被指派为 reviewer 或执行独立审计的 Agent。

**双审编排原则**：

1. 同一轮变更必须由 2 个独立审计 Agent 交叉审计，不能少
2. 主会话 Agent 负责汇总双审意见，但不替代任何一席审计
3. 任一审计报告任何问题，整体结论即未通过；`non-blocking` 仅用于描述优先级，不改变 `REJECT`
4. 只有双审都 zero findings，且各自给出 `FINAL-VERDICT` + `ACCEPT`，并确认 required checks 全绿、证据完整时，才能结束修复-复审循环

**零问题 ACCEPT 原则**：

1. 只要存在任何 finding，无论严重度如何，`FINAL-VERDICT` 都必须是 `REJECT`
2. `Accept with risk`、`ACCEPT but...` 等“带问题通过”的表述一律视为违规

**审计四律**：

1. CI 能查的信任 CI；CI 不能查的才是审计主战场（语义正确性、spec 对齐、架构合理性）
2. 每条结论必须有证据（diff 引用或命令输出）
3. 问自己：这个 PR 合并后最可能出什么问题？然后去验证
4. 代码写了不等于功能生效——必须验证用户操作路径是否连通

**审计层级**：

| 层级 | 适用条件 | 评论模型 | 命令 |
|------|---------|---------|------|
| **L** | risk=low/minimal, scope=isolated | 单条 FINAL-VERDICT | `scripts/review-audit.sh L` |
| **S** | risk=medium, scope=single-module | PRE-AUDIT → FINAL-VERDICT（有任何 finding 时插入 RE-AUDIT） | `scripts/review-audit.sh S` |
| **D** | risk=critical/high 或 cross-module | PRE → RE(多轮) → FINAL | `scripts/review-audit.sh D` |

**关键禁令**（违反 → REJECT）：

1. 不能只给建议不给结论（必须 `ACCEPT/REJECT`）
2. 不能无证据下结论
3. 不能 required checks 未通过时给可合并结论
4. 不能把审计结果只写本地不发 PR 评论
5. 不能用"后续再看"替代当前阻断问题
6. 不能以单审替代双审
7. 不能在存在任何 finding（包括 `non-blocking` / `suggestion` / `nit` / `tiny issue`）时给出 `ACCEPT`
8. 不能以 `Accept with risk` 或其他“有问题但先过”的表述代替 `REJECT`

完整审计协议（变更分类、检查项索引、评论模板、根因排查格式、必做白名单）详见 `docs/references/audit-protocol.md`。

---

## 七、参考文档

> 以下为真实存在的文档索引。所有参考文档位于 `docs/references/`。

| 文档 | 路径 | 查阅时机 |
|------|------|---------|
| 测试指南 | `docs/references/testing-guide.md` | 写测试前 |
| 测试命令 | `docs/references/test-commands.md` | 跑测试时 |
| 前端视觉规范 | `docs/references/frontend-visual-quality.md` | 写前端组件前 |
| 审计协议 | `docs/references/audit-protocol.md` | 审计/Review 时 |
| 架构经验 | `docs/references/architecture-lessons.md` | 架构决策时 |
| 产品质量清单 | `docs/references/product-quality-checklist.md` | PR 自检时 |
| UI Prompt 工程 | `docs/references/prompt-engineering-for-ui.md` | AI UI 生成时 |

**Spec 模块索引**（位于 `openspec/specs/`）：

ai-service · context-engine · design-system · document-management · editor · ipc · knowledge-graph · memory-system · project-management · search-and-retrieval · skill-system · version-control · workbench

**脚本索引**（位于 `scripts/`）：

| 脚本 | 用途 |
|------|------|
| `agent_task_begin.sh` | 创建 worktree 并开始任务 |
| `agent_worktree_setup.sh` | 仅创建 worktree |
| `agent_controlplane_sync.sh` | 控制面同步 |
| `agent_git_hooks_install.sh` | 安装 git hooks |
| `agent_pr_preflight.sh` | PR 预检 |
| `agent_pr_automerge_and_sync.sh` | auto-merge（需审计通过） |
| `agent_github_delivery.py` | GitHub 交付工具 |
| `review-audit.sh` | 分层审计入口 |

---

**读完本文件后，阅读任务相关模块的 `openspec/specs/<module>/spec.md`，按 §零 查阅表找到对应参考文档，再开始工作。**
