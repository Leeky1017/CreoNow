# 交付流程与 CI/CD 规范

本文档定义 CreoNow 项目的交付流程体系、CI/CD 门禁设计、OpenSpec 规范化用法，以及 SKILL（Agent 交付指令）的重构指导。与 [测试规范与 TDD 指南](https://www.notion.so/TDD-e6b00c14cffa410291b04b7a43c44a40?pvs=21) 配套使用，共同构成 CreoNow 的工程规范基线。

---

# 一、当前体系诊断与重构目标

## 1.1 当前状态

CreoNow 的交付体系基于 **OpenSpec + Rulebook + GitHub** 三体系协同，通过一个名为 SKILL 的 Agent 指令文档驱动所有任务的全自动交付。当前存在以下问题：

| **领域** | **问题** | **影响** |
| --- | --- | --- |
| SKILL 文档 | 流程步骤过于冗长，职责边界不清，混合了「规则」与「操作手册」 | Agent 执行效率低，人类难以审查和维护 |
| OpenSpec | spec 路径和命名沿用了模板项目（如 `unified_remediation_plan`），未针对 CreoNow 的领域模型定制 | spec 与实际代码/功能脱节，形同虚设 |
| CI/CD | `ci.yml` 将所有检查串行在一个 job 中；`merge-serial` 只是占位没有实质逻辑；缺少覆盖率门禁 | CI 慢、反馈差、门禁不完整 |
| 脚本 | 多个 `agent_*.sh` 脚本缺少错误处理和幂等性保证 | 自动化流程中断时难以恢复 |

## 1.2 重构目标

1. **SKILL 精简化**：从「操作手册」变为「规则声明」，Agent 只需知道约束，不需要被教每一步怎么敲命令
2. **OpenSpec 实用化**：spec 按 CreoNow 的领域模块组织，每个 spec 真正描述行为和约束
3. **CI 并行化 + 门禁完善**：快速反馈、覆盖率检查、真正有效的串行合并
4. **脚本健壮化**：幂等、可重试、有明确退出码

---

# 二、三体系架构设计

## 2.1 整体关系

```
┌─────────────────────────────────────────────────────┐
│                    SKILL（Agent 指令）                │
│     定义：交付规则 + 约束条件 + 质量标准              │
│     不定义：具体命令、脚本路径、操作步骤              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   OpenSpec    │  │ Rulebook │  │    GitHub      │  │
│  │  （做什么）    │  │（怎么做） │  │  （怎么验收）   │  │
│  │              │  │          │  │               │  │
│  │ specs/       │  │ tasks/   │  │ .github/      │  │
│  │ project.md   │  │ evidence/│  │ scripts/      │  │
│  │ changes/     │  │          │  │ ci.yml        │  │
│  └──────────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 2.2 各体系职责边界

| **体系** | **职责** | **产出物** | **谁消费** |
| --- | --- | --- | --- |
| **OpenSpec** | 定义系统「应该做什么」——功能行为、约束、场景 | [`spec.md`](http://spec.md)（行为规范）、[`proposal.md`](http://proposal.md)（变更提案） | Agent 写代码前读、人类 review 时读 |
| **Rulebook** | 定义任务「怎么做」——拆解步骤、执行记录、证据归档 | [`tasks.md`](http://tasks.md)（步骤拆解）、`evidence/`（执行证据） | Agent 执行中写、任务归档时读 |
| **GitHub** | 定义交付「怎么验收」——自动化门禁、合并策略、制品管理 | CI checks（全绿）、PR（可审查）、Issue（可追踪） | CI 自动运行、人类审查 PR 时读 |

---

# 三、SKILL 重构规范

## 3.1 设计原则

SKILL 应当是一份**声明式规则文档**，而非操作手册。

| **应该包含** | **不应该包含** |
| --- | --- |
| 交付必须满足的约束条件 | 具体的 shell 命令和脚本路径 |
| 命名规则和格式要求 | 命令的示例输出 |
| 质量门禁和验收标准 | 错误恢复的具体重试逻辑 |
| 各体系之间的协作规则 | 脚本的内部实现细节 |

**原因**：Agent 应该理解「规则」，然后自己决定如何执行。把命令写死在 SKILL 里会导致：

- 脚本一改，SKILL 就过期
- Agent 变成「复制粘贴机器」而非「理解规则的执行者」
- 文档膨胀，核心规则被噪音淹没

## 3.2 重构后的 SKILL 结构（参考）

SKILL 应精简为以下几个板块：

### 板块一：命名约定

定义 Issue、Branch、Commit、PR、RUN_LOG 的命名规则。这部分保留，因为是硬约束。

### 板块二：交付规则（5 条以内）

1. **Spec-first**：任何功能变更必须先有 OpenSpec spec，再写代码
2. **红灯先行**：测试必须先失败再通过，禁止先写实现再补测试（与 [测试规范与 TDD 指南](https://www.notion.so/TDD-e6b00c14cffa410291b04b7a43c44a40?pvs=21) 对齐）
3. **证据落盘**：关键命令的输入输出必须写入 `RUN_LOG`，禁止 silent failure
4. **门禁全绿**：PR 必须通过 `ci`、`openspec-log-guard`、`merge-serial` 三个 checks
5. **串行合并**：所有 PR 通过 auto-merge + merge-serial 串行化，禁止手动合并

### 板块三：工作流阶段

只描述阶段和阶段的「完成条件」，不描述具体命令：

| **阶段** | **完成条件** |
| --- | --- |
| 1. 任务准入 | Issue 已创建或已认领，N 和 SLUG 已确定 |
| 2. 规格制定 | Rulebook task 已创建且验证通过；OpenSpec spec 已编写或更新 |
| 3. 环境隔离 | Worktree 已创建，工作目录已切换 |
| 4. 实现与测试 | 按 TDD 循环实现；所有测试通过；RUN_LOG 已记录 |
| 5. 提交与合并 | PR 已创建；auto-merge 已开启；三个 checks 全绿；PR 已确认合并 |
| 6. 收口与归档 | 控制面已同步；worktree 已清理；Rulebook task 已归档 |

### 板块四：异常处理规则

只列出规则，不列出重试脚本：

- `gh` 命令超时：最多重试 3 次，仍失败则记录并升级
- PR 需要 review：记录 blocker，通知 reviewer，禁止 silent abandonment
- checks 失败：修复后重新 push，失败原因写入 RUN_LOG

## 3.3 具体命令放哪里？

具体命令和脚本用法应放在**仓库内的 `docs/[agent-playbook.md](http://agent-playbook.md)`** 或 **`scripts/[README.md](http://README.md)`** 中。SKILL 只引用路径，不内联命令。

---

# 四、OpenSpec 体系重构规范

## 4.1 目录结构

OpenSpec 的目录应按 CreoNow 的**领域模块**组织，而非按任务或修复计划组织：

```
openspec/
├── project.md                       ← 项目概述（AI 入口文件）
├── specs/                           ← 按功能模块组织的主规范
│   ├── context-engine/
│   │   └── spec.md                  ← 上下文引擎行为规范
│   ├── knowledge-graph/
│   │   └── spec.md                  ← 知识图谱行为规范
│   ├── memory-system/
│   │   └── spec.md                  ← 记忆系统行为规范
│   ├── skill-system/
│   │   └── spec.md                  ← 技能系统行为规范
│   ├── editor/
│   │   └── spec.md                  ← TipTap 编辑器行为规范
│   ├── ipc/
│   │   └── spec.md                  ← IPC 通信层契约
│   └── version-control/
│       └── spec.md                  ← 版本管理行为规范
├── changes/                         ← 进行中的变更（Delta Specs）
│   └── add-memory-decay/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/
│           └── memory-system/
│               └── spec.md          ← delta：标记 ADDED/MODIFIED/REMOVED
└── _ops/
    └── task_runs/                   ← RUN_LOGs
        ├── ISSUE-1.md
        └── ISSUE-2.md
```

## 4.2 [`project.md`](http://project.md) 编写规范

[`project.md`](http://project.md) 是 AI Agent 理解项目的**第一个文件**，必须包含：

1. **项目简介**：一句话定位 + 技术栈
2. **架构概览**：三层架构（渲染层 / IPC 层 / 业务层）及其边界
3. **目录结构**：`src/` 的顶层目录说明
4. **核心模块索引**：每个模块对应的 spec 路径
5. **开发约定**：语言、框架版本、包管理器、测试工具
6. **禁止事项**：明确列出 Agent 不应做的事

示例骨架：

```markdown
# CreoNow

AI 驱动的文字创作 IDE，Electron + React 18 + TypeScript + TipTap 2，Windows-first。

## Architecture

| Layer       | Path           | Runtime           |
|-------------|----------------|-------------------|
| Renderer    | src/renderer/  | Electron Renderer |
| IPC         | src/ipc/       | Bridge            |
| Main        | src/main/      | Electron Main     |

## Module Index

| Module           | Spec                              |
|------------------|-----------------------------------|
| Context Engine   | specs/context-engine/spec.md      |
| Knowledge Graph  | specs/knowledge-graph/spec.md     |
| Memory System    | specs/memory-system/spec.md       |
| Skill System     | specs/skill-system/spec.md        |
| Editor           | specs/editor/spec.md              |
| IPC              | specs/ipc/spec.md                 |
| Version Control  | specs/version-control/spec.md     |

## Conventions

- Package manager: pnpm 8
- Test framework: Vitest
- E2E: Playwright
- All commits must reference an Issue: `<type>: <summary> (#N)`
```

## 4.3 Spec 编写规范

每个 [`spec.md`](http://spec.md) 必须遵循以下结构：

```markdown
# <module-name> Specification

## Purpose
一句话描述模块的职责。

## Requirements

### Requirement: <行为名称>
<描述这个行为的规则>

#### Scenario: <场景名称>
- GIVEN <前置条件>
- WHEN <触发动作>
- THEN <期望结果>

#### Scenario: <边界/错误场景>
- GIVEN <前置条件>
- WHEN <异常输入/异常情况>
- THEN <期望的错误处理>
```

**关键原则**：

- Spec 描述**行为和约束**，不描述实现方式
- 每个 Requirement 至少有一个正常场景和一个异常场景
- Scenario 使用 GIVEN/WHEN/THEN 格式，与测试用例直接对应
- Spec 变更必须通过 Delta Spec 流程（proposal → apply → archive），不得直接修改主 spec

## 4.4 OpenSpec 与 TDD 的衔接

OpenSpec 的 Scenario 应当能**直接翻译为测试用例**：

| **Spec 中的 Scenario** | **对应的测试** |
| --- | --- |
| GIVEN total budget = 200, WHEN allocate, THEN immediate ≥ 100 | `it('should guarantee minimum allocation for immediate layer when budget is tight')` |
| GIVEN budget = 0, WHEN allocate, THEN throw InvalidBudgetError | `it('should throw InvalidBudgetError when budget is zero')` |
| GIVEN entity type not in allowed list, WHEN query, THEN throw InvalidEntityTypeError | `it('should reject when entity type is not in allowed list')` |

Agent 的工作流程是：

1. **读 spec** → 理解模块行为和约束
2. **写测试** → 把 Scenario 翻译为测试用例（Red）
3. **写实现** → 让测试通过（Green）
4. **重构** → 在绿灯保护下优化（Refactor）

---

# 五、CI/CD 门禁规范

## 5.1 CI 架构设计

CI 由三个独立的 GitHub Actions workflow 组成，各司其职：

| **Workflow 文件** | **Check 名称** | **职责** | **触发条件** |
| --- | --- | --- | --- |
| `ci.yml` | `ci` | 代码质量与功能正确性验证 | push to main + PR to main |
| `openspec-log-guard.yml` | `openspec-log-guard` | 交付证据完整性验证 | PR to main |
| `merge-serial.yml` | `merge-serial` | 串行化合并，防止并发冲突 | PR to main |

三个 checks 必须全部配置为 GitHub Branch Protection 的 required checks。任何一个不通过，PR 不可合并。

## 5.2 `ci.yml` 重构规范

### 设计原则

1. **并行优先**：无依赖关系的检查应并行运行，缩短总耗时
2. **快速失败**：最快的检查（lint、typecheck）应最先给出反馈
3. **环境隔离**：每个 job 独立安装依赖，不共享状态
4. **成本控制**：Windows runner 只在必要时运行

### Job 拆分方案

```
ci.yml
├── lint-and-typecheck      (ubuntu, ~1min)     ← 最快反馈
├── unit-test               (ubuntu, ~1min)     ← 核心验证
├── integration-test        (ubuntu, ~2min)     ← 模块协作验证
├── contract-check          (ubuntu, ~30s)      ← IPC 契约验证
├── storybook-build         (ubuntu, ~2min)     ← UI 构建验证
├── windows-e2e             (windows, ~10min)   ← 完整用户流程
└── windows-build           (windows, 仅 main)  ← 构建制品
```

### 各 Job 详细要求

**`lint-and-typecheck`**：

- 运行 `pnpm lint` 和 `pnpm typecheck`
- 这是最快的 job，用于第一时间给出代码风格和类型错误反馈
- 失败时：开发者应优先修复这些问题

**`unit-test`**：

- 运行 `pnpm test:unit`
- **必须包含覆盖率检查**，阈值与 [测试规范与 TDD 指南](https://www.notion.so/TDD-e6b00c14cffa410291b04b7a43c44a40?pvs=21) 中的覆盖率要求对齐：

| **模块类别** | **CI 覆盖率门禁** |
| --- | --- |
| 核心业务逻辑（context-engine, knowledge-graph, memory-system） | ≥ 90% |
| 一般业务模块（DAO, skill-executor, version-snapshot） | ≥ 80% |
| UI 组件和胶水代码 | ≥ 60% |

覆盖率可通过 Vitest 的 `coverage.thresholds` 配置实现，在 `vitest.config.ts` 中设置而非在 CI 脚本中硬编码。

**`integration-test`**：

- 运行 `pnpm test:integration`
- 可使用 SQLite 内存数据库
- LLM API 必须 mock，不可消耗真实额度

**`contract-check`**：

- 运行 `pnpm contract:check`
- 验证 IPC 通道的类型定义在前后端之间一致

**`storybook-build`**：

- 运行 `pnpm -C apps/desktop storybook:build`
- 仅验证构建不报错，不做视觉回归测试

**`windows-e2e`**：

- 运行 Playwright Electron E2E 测试
- 失败时上传 Playwright report 和 test results 作为 artifacts
- 耗时最长，但不阻塞其他 job

**`windows-build`**：

- **仅在 push to main 时运行**（`if: github.event_name == 'push'`），PR 阶段不构建
- 上传构建制品（NSIS + zip）

### 依赖安装规则

- **必须使用** `pnpm install --frozen-lockfile`，不加 fallback
- lockfile 不一致时 CI 应直接失败，强制开发者更新 lockfile 后再提交
- 可使用 composite action 抽取重复的 setup 步骤：

```yaml
# .github/actions/setup-node-pnpm/action.yml
name: Setup Node + pnpm
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v2
      with:
        version: 8
    - uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "pnpm"
    - run: pnpm install --frozen-lockfile
      shell: bash
```

## 5.3 `openspec-log-guard.yml` 重构规范

当前问题：非 `task/` 分支会跳过检查（⚠️ 警告但通过）。

重构规则：

- `task/<N>-<slug>` 分支：必须存在对应的 `RUN_LOG`，否则失败
- 非 `task/` 分支（如 hotfix、dependabot）：检查跳过，**但必须在 PR body 中说明原因**
- 增加 `RUN_LOG` 内容校验：检查是否包含必要字段（Issue、Branch、PR、Plan、Runs）

## 5.4 `merge-serial.yml` 重构规范

### 当前问题

当前的 `merge-serial.yml` 只是一个占位符——它打印一条消息就通过了。`concurrency` 配置虽然能防止 workflow 并发，但**不能防止 PR 并发合并**。

### 它应该做什么

`merge-serial` 的真正目的是：确保 PR 基于最新的 `main` 合并，避免两个 PR 各自通过了 CI 但合并后互相冲突。

实现方式有两种（择一）：

**方案 A：GitHub Merge Queue（推荐）**

- 开启 GitHub 原生的 Merge Queue 功能
- 每个 PR 进入队列后，GitHub 会自动 rebase 到最新 main 并重新运行 CI
- 此方案下 `merge-serial.yml` 可以移除，由 GitHub 原生机制替代

**方案 B：自定义串行化**

- `merge-serial.yml` 检查当前是否有其他 PR 正在合并中
- 如果有：等待或标记为 pending
- 如果没有：通过
- 此方案需要更多自定义逻辑，维护成本较高

### 建议

如果仓库有 GitHub Team/Enterprise 计划，**优先使用 Merge Queue**。如果是 Free 计划，保留 `merge-serial.yml` 但增加实质性检查（如检查 PR base 是否为最新 main）。

## 5.5 CI 速度预算

| **Job** | **目标耗时** | **超时上限** |
| --- | --- | --- |
| lint-and-typecheck | < 1 分钟 | 3 分钟 |
| unit-test | < 1 分钟 | 5 分钟 |
| integration-test | < 2 分钟 | 5 分钟 |
| contract-check | < 30 秒 | 2 分钟 |
| storybook-build | < 2 分钟 | 5 分钟 |
| windows-e2e | < 10 分钟 | 20 分钟 |
| windows-build | < 5 分钟 | 15 分钟 |

每个 job 应通过 `timeout-minutes` 设定超时上限，防止 CI 卡死。

---

# 六、脚本体系重构规范

## 6.1 脚本清单与职责

| **脚本** | **职责** | **调用时机** |
| --- | --- | --- |
| `agent_task_[start.sh](http://start.sh)` | 创建 Issue + 初始化任务 | 阶段 1：任务准入 |
| `agent_controlplane_[sync.sh](http://sync.sh)` | 同步控制面的 main 到最新 | 阶段 3 前 + 阶段 6 |
| `agent_worktree_[setup.sh](http://setup.sh)` | 创建 worktree 隔离环境 | 阶段 3：环境隔离 |
| `agent_pr_[preflight.sh](http://preflight.sh)` | PR 前的预检查 | 阶段 5：提交前 |
| `agent_pr_automerge_and_[sync.sh](http://sync.sh)` | 创建 PR + auto-merge + 等待 + 同步 | 阶段 5：提交与合并 |
| `agent_worktree_[cleanup.sh](http://cleanup.sh)` | 清理 worktree | 阶段 6：收口 |
| `agent_github_sync_[audit.sh](http://audit.sh)` | 审计 GitHub 同步状态 | 阶段 6（推荐） |

## 6.2 脚本编写规范

每个脚本必须满足以下要求：

1. **幂等性**：重复运行同一脚本不会产生副作用（如：worktree 已存在时不报错，而是直接使用）
2. **明确退出码**：
    - `0`：成功
    - `1`：可恢复的失败（如网络超时，可重试）
    - `2`：不可恢复的失败（如权限不足，需人工介入）
3. **结构化输出**：关键步骤输出带前缀的日志，便于 RUN_LOG 记录
    - `[OK]`：成功
    - `[FAIL]`：失败
    - `[SKIP]`：跳过（已完成 / 不需要）
    - `[WARN]`：警告但不阻断
4. **参数校验**：脚本入口处校验必要参数，缺失时打印 usage 并退出
5. **错误处理**：使用 `set -euo pipefail`，关键命令用 `|| handle_error` 捕获

## 6.3 脚本与 SKILL 的关系

- SKILL 只声明「需要环境隔离」「需要 PR 预检」等规则
- 脚本是规则的**具体实现**
- 脚本的使用说明放在 `scripts/[README.md](http://README.md)` 中，不放在 SKILL 中
- Agent 读 SKILL 理解规则 → 读 `scripts/[README.md](http://README.md)` 找到对应脚本 → 执行脚本

---

# 七、RUN_LOG 规范

## 7.1 定义

`RUN_LOG` 是每个任务的**执行证据文档**，存放于 `openspec/_ops/task_runs/ISSUE-<N>.md`。它是 Agent 交付的「黑匣子」，用于事后追溯和审计。

## 7.2 格式要求

```markdown
# ISSUE-<N>

- Issue: #<N>
- Branch: task/<N>-<slug>
- PR: <PR 链接，合并后必须为真实链接>

## Plan
- <1-3 条计划要点>

## Runs

### <YYYY-MM-DD HH:MM> <标签>
- Command: `<执行的命令>`
- Key output: `<关键输出片段>`
- Result: ✅ 通过 / ❌ 失败 / ⚠️ 需关注
- Evidence: `<证据文件路径或链接>`
```

## 7.3 规则

- `Runs` 段只追加不修改，保持时间线完整
- 每次 `pytest`、`lint`、`typecheck` 的运行结果都应记录
- CI 失败和修复过程必须记录
- PR 链接在创建 PR 后必须回填，不得留占位符
- `openspec-log-guard` 会自动校验 RUN_LOG 的存在性和基本格式

---

# 八、重构执行路线图

以下为建议的重构顺序，每个阶段独立可交付：

| **阶段** | **内容** | **产出** | **优先级** |
| --- | --- | --- | --- |
| Phase 1 | CI 并行化 + 覆盖率门禁 + 依赖安装修复 | 新的 `ci.yml` | 🔴 高（立即可做，收益明显） |
| Phase 2 | OpenSpec 目录重组 + [`project.md`](http://project.md) 编写 | 新的 `openspec/` 目录结构 | 🔴 高（后续任务都依赖这个） |
| Phase 3 | SKILL 精简为声明式规则文档 | 新的 SKILL 文档 | 🟡 中（Phase 2 完成后做） |
| Phase 4 | `merge-serial` 增加实质逻辑或切换 Merge Queue | 更新的 `merge-serial.yml` 或 repo 设置 | 🟡 中 |
| Phase 5 | 脚本健壮化（幂等、退出码、错误处理） | 更新的 `scripts/` | 🟢 低（逐步改进即可） |
| Phase 6 | `openspec-log-guard` 增强内容校验 | 更新的 `openspec-log-guard.yml` | 🟢 低 |

---

本文档为 CreoNow 项目交付流程的重构指导基线。具体实施时，每个 Phase 应作为一个独立的 Issue/PR 交付，遵循本文档定义的流程本身——即 spec-first、TDD、CI 全绿、RUN_LOG 落盘。