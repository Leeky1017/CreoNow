# AGENTS.md — Agent 宪法

本文档是 CreoNow 项目中**所有 AI Agent 的通用宪法**。它是 Agent 进入项目时**必须首先阅读**的文件，定义了不可违反的规则、项目结构和工作方式。

本文档对应仓库根目录的 [`AGENTS.md`](http://AGENTS.md)。当此 Notion 页面内容更新后，应同步到仓库。

<aside>
🚨

**所有 AI Agent 在执行任何任务之前，必须先阅读本文件。违反本文件中标记为「禁止」的规则，等同于交付失败。**

</aside>

---

# 一、项目身份

**CreoNow（CN）** 是一个 AI 驱动的文字创作 IDE，定位为「创作者的 Cursor」。

| **项目** | **技术栈** | **平台** | **包管理** | **测试** | **E2E** |
| --- | --- | --- | --- | --- | --- |
| CreoNow | Electron + React 18 + TypeScript + TipTap 2 | Windows-first | pnpm 8 | Vitest | Playwright |

---

# 二、架构

| **架构层** | **路径** | **运行环境** | **包含内容** |
| --- | --- | --- | --- |
| 前端（渲染层） | `src/renderer/` | Electron 渲染进程 | React 组件、TipTap 编辑器、Zustand store、UI 交互 |
| API（通信层） | `src/ipc/` | 进程间桥梁 | IPC 通道定义、消息类型、参数校验 |
| 后端（业务层） | `src/main/` | Electron 主进程 | 上下文引擎、知识图谱、记忆系统、技能系统、SQLite DAO、LLM 调用 |

### 核心模块

| **模块** | **职责** | **Spec 路径** |
| --- | --- | --- |
| Context Engine | 分层上下文管理、Token 预算分配与裁剪 | `openspec/specs/context-engine/[spec.md](http://spec.md)` |
| Knowledge Graph | 实体（角色/地点/事件）和关系的管理与语义检索 | `openspec/specs/knowledge-graph/[spec.md](http://spec.md)` |
| Memory System | 写作偏好学习、记忆存储与衰减 | `openspec/specs/memory-system/[spec.md](http://spec.md)` |
| Skill System | AI 技能抽象（续写/改写/扩写等）、三级作用域 | `openspec/specs/skill-system/[spec.md](http://spec.md)` |
| Editor | TipTap 编辑器集成、富文本操作 | `openspec/specs/editor/[spec.md](http://spec.md)` |
| IPC | 前后端通信契约 | `openspec/specs/ipc/[spec.md](http://spec.md)` |
| Version Control | 快照、AI 修改标记（actor=ai）、Diff、版本恢复 | `openspec/specs/version-control/[spec.md](http://spec.md)` |

---

# 三、不可违反的规则

以下是本项目的**硬性规则**。没有例外，没有「先这样后面再补」。

## 3.1 Spec-First（规范优先）

- **任何功能变更必须先有 spec，再写代码**
- 收到任务后，第一步是阅读 `openspec/specs/<module>/[spec.md](http://spec.md)`
- 如果 spec 不存在或不完整，必须先通过变更流程补充 spec，不得直接写代码
- 如果开发中发现 spec 遗漏的场景，必须先补充 delta spec 并通知 Owner，等确认后再实现

## 3.2 TDD（测试驱动开发）

- **测试必须先于实现**：先写测试（Red）→ 写最少实现（Green）→ 重构（Refactor）
- Spec 中的每个 Scenario 必须被翻译为至少一个测试用例，不得遗漏
- 禁止先写实现再补测试
- 禁止编写永远通过的测试（空断言、断言常量等）
- 禁止为了覆盖率而编写不验证行为的测试
- 详见：`测试规范与 TDD 指南`（Notion）

## 3.3 证据落盘

- 每个任务必须有 `RUN_LOG`，路径为 `openspec/_ops/task_runs/ISSUE-<N>.md`
- 关键命令的输入和输出必须记录在 RUN_LOG 的 Runs 段中
- CI 失败和修复过程必须记录
- 禁止 silent failure——异常必须有明确错误码/信息

## 3.4 门禁全绿

- PR 必须通过三个 required checks：`ci`、`openspec-log-guard`、`merge-serial`
- 所有 PR 必须启用 auto-merge，禁止手动合并
- CI 失败后必须修复再 push，不得「先合并再修」

## 3.5 变更流程

- 主 spec（`openspec/specs/**/[spec.md](http://spec.md)`）代表系统当前真实状态，**禁止直接修改**
- 所有变更必须走 **Proposal → Apply → Archive** 流程
- Delta Spec 中使用 `[ADDED]`/`[MODIFIED]`/`[REMOVED]` 标记
- PR 合并后才能将 delta spec 归档到主 spec

---

# 四、禁止行为清单

<aside>
🚫

以下行为**绝对禁止**，违反任何一条即为交付失败。

</aside>

1. **禁止跳过 spec 直接写代码**
2. **禁止先写实现再补测试**
3. **禁止直接修改主 spec**（必须走 Proposal → Apply → Archive）
4. **禁止 silent failure**（异常必须有错误码、错误信息和日志）
5. **禁止「先合并再修」**（CI 不绿就不合并）
6. **禁止手动合并 PR**（必须用 auto-merge）
7. **禁止测试覆盖的 Scenario 少于 spec 定义的 Scenario**
8. **禁止在测试中硬编码实现细节**（如依赖内部变量名、私有方法调用顺序）
9. **禁止测试之间共享可变状态**
10. **禁止依赖真实时间、随机数、网络请求**（使用 fake timer、固定种子、mock）
11. **禁止消耗真实 LLM API 额度**（集成测试和 E2E 必须 mock）
12. **禁止 `pnpm install` 不带 `--frozen-lockfile`**
13. **禁止 RUN_LOG 的 PR 字段留占位符**（必须回填真实链接）
14. **禁止 silent abandonment**（遇到 blocker 必须记录并通知，不得静默放弃）

---

# 五、工作流程

## 5.1 接到任务时

```
1. 阅读本文件（AGENTS.md）
2. 阅读相关模块的 spec（openspec/specs/<module>/spec.md）
3. 阅读测试规范（测试规范与 TDD 指南）
4. 确认任务的 Issue 号（N）和 SLUG
5. 进入开发流程
```

## 5.2 开发流程

| **阶段** | **完成条件** | **关键动作** |
| --- | --- | --- |
| 1. 任务准入 | Issue 已创建或认领，N 和 SLUG 已确定 | 创建或认领 Issue |
| 2. 规格制定 | Rulebook task 已创建且验证通过；spec 已编写或更新 | 创建 task + 编写/更新 delta spec |
| 3. 环境隔离 | Worktree 已创建，工作目录已切换 | 运行 worktree 脚本 |
| 4. 实现与测试 | 按 TDD 循环实现；所有测试通过；RUN_LOG 已记录 | Red → Green → Refactor → 记录证据 |
| 5. 提交与合并 | PR 已创建；auto-merge 已开启；三个 checks 全绿；PR 已确认合并 | push → 创建 PR → watch checks → 确认合并 |
| 6. 收口与归档 | 控制面已同步；worktree 已清理；Rulebook task 已归档 | 同步 → 清理 → 归档 |

## 5.3 命名约定

| **实体** | **格式** | **示例** |
| --- | --- | --- |
| Branch | `task/<N>-<slug>` | `task/42-memory-decay` |
| Commit | `<type>: <summary> (#<N>)` | `feat: add memory decay logic (#42)` |
| PR title | `<title> (#<N>)` | `Add memory decay mechanism (#42)` |
| PR body | 必须包含 `Closes #<N>` | `Closes #42` |
| RUN_LOG | `openspec/_ops/task_runs/ISSUE-<N>.md` | `openspec/_ops/task_runs/[ISSUE-42.md](http://ISSUE-42.md)` |
| Worktree | `.worktrees/issue-<N>-<slug>` | `.worktrees/issue-42-memory-decay` |

Commit type 可选值：`feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`ci`

---

# 六、Spec 与代码的关系

## 6.1 Spec → 测试 → 实现

```
Spec Scenario          →  测试用例             →  实现代码
─────────────────────────────────────────────────────────
GIVEN（前置条件）      →  Arrange（准备）       →  被测模块的依赖
WHEN（触发动作）       →  Act（执行）           →  被测模块的接口
THEN（期望结果）       →  Assert（验证）        →  被测模块的行为
```

## 6.2 同步规则

- Spec 新增 Scenario → 必须新增对应测试
- Spec 修改 Scenario → 必须同步修改对应测试
- Spec 删除 Scenario → 必须同步删除对应测试
- 开发中发现 spec 遗漏 → 先补 delta spec + 通知 Owner → 等确认后再实现

---

# 七、测试要求速查

详细规范见 `测试规范与 TDD 指南`。此处为速查。

## 7.1 测试分层

| **层级** | **运行时机** | **速度要求** | **外部依赖** |
| --- | --- | --- | --- |
| 单元测试 | 每次保存 | 全套 30 秒内 | 全部 mock |
| 集成测试 | 每次提交 | 全套 2 分钟内 | SQLite 内存 OK，LLM 必须 mock |
| E2E 测试 | 每次合并 | 全套 10 分钟内 | LLM 用 mock server |
| AI Eval | Prompt/上下文变更时 | 取决于 API | 真实 LLM，手动触发 |

## 7.2 覆盖率要求

| **模块类别** | **最低覆盖率** |
| --- | --- |
| 核心业务逻辑（Context Engine、Knowledge Graph、Memory System） | 90% |
| 一般业务模块（DAO、Skill Executor、Version Snapshot） | 80% |
| UI 组件和胶水代码 | 60% |

## 7.3 测试编写规范

- 命名：`it('should <期望行为> when <前置条件>')` — 必须清晰描述被测行为
- 结构：严格 AAA（Arrange-Act-Assert），段间空行分隔
- 独立性：每个测试独立运行，不依赖执行顺序，不共享可变状态
- 确定性：同一测试在同一代码上运行 N 次，结果完全相同
- 断言：每个测试至少一个有意义的断言，优先使用具体断言

---

# 八、文件组织

## 8.1 源码

```
src/
├── main/                    ← 后端（Electron 主进程）
│   ├── context-engine/
│   ├── knowledge-graph/
│   ├── memory-system/
│   ├── skill-system/
│   └── version-control/
├── renderer/                ← 前端（Electron 渲染进程）
│   └── components/
└── ipc/                     ← IPC 通信层
```

## 8.2 测试

```
src/**/*.test.ts             ← 单元测试（与源文件并置）
tests/
├── integration/             ← 集成测试
├── e2e/                     ← 端到端测试
└── ai-eval/                 ← AI 输出质量测试
    └── golden-tests/
```

## 8.3 OpenSpec

```
openspec/
├── project.md               ← 项目概述（你的第二个入口文件）
├── specs/                   ← 主规范（Source of Truth）
│   └── <module>/spec.md
├── changes/                 ← 进行中的变更（Delta Specs）
│   └── <change-name>/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/<module>/spec.md
└── _ops/
    └── task_runs/           ← RUN_LOGs
```

---

# 九、工具链

| **用途** | **工具** | **说明** |
| --- | --- | --- |
| 包管理 | pnpm 8 | 必须使用 `--frozen-lockfile` |
| 构建 | Vite | — |
| 测试框架 | Vitest | 兼容 Jest API |
| 组件测试 | React Testing Library | 测试行为而非实现 |
| E2E | Playwright | 支持 Electron |
| Mock | Vitest 内置（vi.mock / vi.fn） | — |
| 样式 | Tailwind CSS 4 | 原子化 CSS |
| 状态管理 | Zustand | — |
| 本地存储 | SQLite | 测试中使用 `:memory:` |

---

# 十、异常处理

| **遇到的情况** | **必须做** | **禁止做** |
| --- | --- | --- |
| Spec 不存在或不完整 | 通知 Owner，请求补充 spec | 根据猜测直接写代码 |
| 开发中发现 spec 遗漏场景 | 写 delta spec 补充 → 通知 Owner → 等确认 | 只写测试不更新 spec |
| `gh` 命令超时 | 重试 3 次（间隔 10s），仍失败 → 记录 RUN_LOG → 升级 | 静默忽略 |
| PR 需要 review | 记录 blocker → 通知 reviewer → 等待 | 静默放弃（silent abandonment） |
| CI 失败 | 修复 → push → 再次 watch → 原因和修复写入 RUN_LOG | 先合并再修 |
| 任务超出 spec 范围 | 先补 spec/task → 经 Owner 确认后再做 | 超范围自由发挥 |

---

# 十一、参考文档索引

| **文档** | **位置** | **用途** |
| --- | --- | --- |
| 本文件（[AGENTS.md](http://AGENTS.md)） | 仓库根目录 [`AGENTS.md`](http://AGENTS.md) | Agent 宪法，第一入口 |
| OpenSpec [project.md](http://project.md) | `openspec/[project.md](http://project.md)` | 项目概述，第二入口 |
| 模块 Spec | `openspec/specs/<module>/[spec.md](http://spec.md)` | 具体模块的行为规范 |
| 测试规范与 TDD 指南 | Notion（CreoNow 项目文档） | 测试编写标准和 TDD 流程 |
| 交付流程与 CI/CD 规范 | Notion（CreoNow 项目文档） | CI 门禁、脚本规范、RUN_LOG 格式 |
| OpenSpec 撰写指南 | Notion（CreoNow 项目文档） | Spec 的写法标准和变更流程 |
| 脚本使用说明 | `scripts/[README.md](http://README.md)` | Agent 脚本的用法 |

---

**读完本文件后，请阅读 `openspec/[project.md](http://project.md)`，然后阅读任务相关模块的 [`spec.md`](http://spec.md)，再开始工作。**