# OpenSpec Agent 执行手册

本文档是 AI Agent 在 CreoNow 项目中使用 OpenSpec 的**操作级参考**。面向所有参与开发的 Agent，定义了从接到任务到完成交付的每个环节中，如何正确地读取、执行和维护 OpenSpec。

与 [OpenSpec 撰写指南](https://www.notion.so/OpenSpec-f5f943426e3d4cf1a5fdf247317734d9?pvs=21)（面向 Owner）互补，本文档聚焦于 **Agent 的具体执行动作**。

---

# 一、Agent 的角色定位

<aside>
🤖

**你是规则的执行者，不是规则的制定者。**

Spec 由 Owner 定义（或 Owner 审阅确认）。你的职责是：精确地将 Spec 翻译为测试和实现，不多不少。

</aside>

你可以做的：

- 按 spec 编写测试和实现代码
- 发现 spec 遗漏的场景后，起草 delta spec 提交给 Owner
- 在 spec 允许的技术空间内做实现决策（架构、数据结构、算法选择）
- 补充 spec 中未涉及的技术约束（性能、并发、错误处理）

你不可以做的：

- 未经 Owner 确认就修改产品行为定义
- 跳过 spec 直接写代码
- 忽略 spec 中的 Scenario
- 超出任务范围自由发挥

---

# 二、接到任务后的标准流程

## 2.1 读取链

每次接到新任务，按以下顺序阅读文档：

```
1. AGENTS.md                              ← 宪法（如已读可跳过）
2. openspec/project.md                    ← 项目概述
3. openspec/specs/<module>/spec.md        ← 任务相关模块的行为规范
4. openspec/changes/<current>/            ← 如有进行中的变更，阅读 delta spec
5. 测试规范与 TDD 指南                      ← 测试编写标准
```

## 2.2 判断任务类型

| **任务类型** | **Spec 是否存在？** | **你的第一步** |
| --- | --- | --- |
| 新功能开发 | 应该已有 delta spec | 阅读 delta spec → 开始 TDD |
| Owner 的非正式描述 | 不存在 | 起草 [proposal.md](http://proposal.md)  • delta spec → 提交 Owner 审阅 |
| Bug 修复 | 检查主 spec | 如果 spec 正确 → 补测试+修代码；如果 spec 有误 → 先走变更流程 |
| 重构 | 不需要改 spec | 确认所有现有测试通过 → 重构 → 确认测试仍通过 |

---

# 三、Spec → 测试的翻译规则

## 3.1 映射关系

每个 Scenario **必须**产出至少一个测试用例。零遗漏。

```
Spec                        →    测试代码
──────────────────────────────────────────────
Requirement                 →    describe('...')
Scenario                    →    it('should ...')
GIVEN                       →    Arrange（beforeEach / 测试内 setup）
WHEN                        →    Act（调用被测函数/方法）
THEN                        →    Assert（expect 断言）
```

## 3.2 翻译示例

**Spec：**

```markdown
#### Scenario: 长期未引用的记忆权重下降
- GIVEN 一条普通记忆已 30 天未被引用
- WHEN 上下文引擎组装 retrieved 层
- THEN 该记忆的权重低于 7 天内引用过的同类型记忆
```

**测试：**

```tsx
describe('Memory Decay', () => {
  it('should assign lower weight to memory unreferenced for 30 days than recently referenced memory', () => {
    // Arrange
    const oldMemory = createMemory({ lastReferenced: daysAgo(30), type: 'character' })
    const recentMemory = createMemory({ lastReferenced: daysAgo(3), type: 'character' })
    const engine = createContextEngine({ memories: [oldMemory, recentMemory] })

    // Act
    const retrieved = engine.buildRetrieved()

    // Assert
    expect(retrieved.weightOf(oldMemory)).toBeLessThan(retrieved.weightOf(recentMemory))
  })
})
```

## 3.3 翻译检查清单

完成测试编写后，执行以下检查：

- [ ]  Spec 中的每个 Scenario 都有对应的 `it()` 测试吗？
- [ ]  每个 GIVEN 都在 Arrange 段中被正确 setup 了吗？
- [ ]  每个 THEN 都有对应的 `expect()` 断言吗？
- [ ]  断言是具体的（`toBe`、`toHaveLength`）还是宽泛的（`toBeTruthy`）？必须具体。
- [ ]  每个测试都能独立运行吗？（不依赖其他测试的执行结果）
- [ ]  三条路径（正常/边界/错误）都覆盖了吗？

---

# 四、TDD 执行细则

## 4.1 严格循环

```
┌──────────────────────────────────────┐
│  对 spec 中的每个 Scenario，执行：     │
│                                      │
│  1. 写一个测试 ──→ 运行 ──→ 确认失败   │
│       ↑           (RED)              │
│       │                              │
│  3. 重构 ←─── 2. 写最少实现 ←── 运行  │
│  (REFACTOR)      (GREEN)    确认通过  │
│       │                              │
│       └──→ 运行全部测试 ──→ 确认通过   │
│            然后进入下一个 Scenario     │
└──────────────────────────────────────┘
```

## 4.2 每一步的具体要求

**Red（红灯）：**

- 写一个描述期望行为的测试
- 运行，确认失败
- 如果测试在没有实现代码的情况下就通过了 → 测试有问题，必须修正

**Green（绿灯）：**

- 编写**最少量**的代码让测试通过
- 此阶段不追求代码优雅，只追求测试通过
- 不要一次性写完所有实现——逐个 Scenario 推进

**Refactor（重构）：**

- 在全部测试通过的保护下优化代码
- 消除重复、改善命名、优化结构
- 重构后**必须再次运行测试**，确认全部通过

## 4.3 TDD 过程中遇到 Spec 问题

| **发现的问题** | **你的处理方式** |
| --- | --- |
| Scenario 的 GIVEN 无法在测试中构造 | 起草修改建议（让 GIVEN 更具体），通知 Owner |
| Scenario 的 THEN 无法用代码断言 | 起草修改建议（让 THEN 可量化），通知 Owner |
| 发现了 Spec 没覆盖的边界情况 | 在 delta spec 中补充新 Scenario（标记 [ADDED]）→ 通知 Owner → 等确认后再写测试 |
| 两个 Scenario 之间存在矛盾 | 停止开发 → 通知 Owner → 等待澄清 |

---

# 五、变更流程执行细则

## 5.1 收到 Owner 的非正式描述时

Owner 可能通过聊天、语音备忘等方式给你一段描述。你需要将其结构化为 OpenSpec 格式。

### 步骤 1：起草 Proposal

```markdown
# 提案：<从 Owner 描述中提炼的标题>

## 背景
<将 Owner 的「为什么」结构化>

## 变更内容
- <变更点 1>
- <变更点 2>

## 受影响的模块
- <模块名> — <如何受影响>

## 不做什么
<从 Owner 的「不要什么」中提炼>
```

### 步骤 2：起草 Delta Spec

将 Proposal 中的变更内容展开为 GIVEN/WHEN/THEN Scenario。

**关键要求：**

- 每个 Requirement 至少写 3 个 Scenario（正常/边界/错误）
- GIVEN 必须可构造（能在测试中 setup）
- THEN 必须可断言（能用 `expect()` 验证）
- 每个 Scenario 必须独立（不依赖其他 Scenario 的结果）
- 用具体数字代替模糊形容词
- 暂时无法确定的数字写 `<TBD: 原因>`

### 步骤 3：提交给 Owner 审阅

将 proposal + delta spec 提交给 Owner，等待确认。**禁止未经确认就开始开发。**

## 5.2 Apply 阶段（开发实现）

收到 Owner 确认后：

1. 创建 Issue（如不存在）
2. 创建 Rulebook task
3. 创建 Worktree 隔离环境
4. 按 TDD 流程实现（读 delta spec → 写测试 → 写实现）
5. 创建 RUN_LOG 并记录过程
6. 创建 PR → 开启 auto-merge → watch checks
7. 确认 PR 已合并

## 5.3 Archive 阶段（归档）

PR 合并后：

1. 将 delta spec 中的 `[ADDED]` 内容合并到主 spec
2. 将 delta spec 中的 `[MODIFIED]` 内容覆盖主 spec 对应部分
3. 将 delta spec 中的 `[REMOVED]` 内容从主 spec 删除
4. 清除主 spec 中所有的 `[ADDED]`/`[MODIFIED]`/`[REMOVED]` 标记
5. `changes/<name>/` 目录保留作为历史记录（不删除）
6. 归档 Rulebook task

---

# 六、RUN_LOG 编写规范

每个任务必须有 RUN_LOG。路径：`openspec/_ops/task_runs/ISSUE-<N>.md`

## 6.1 模板

```markdown
# ISSUE-<N>

- Issue: #<N>
- Branch: task/<N>-<slug>
- PR: <创建后回填真实链接，禁止留占位符>

## Plan
- <1-3 条计划要点>

## Runs

### <YYYY-MM-DD HH:MM> <标签>
- Command: `<执行的命令>`
- Key output: `<关键输出片段>`
- Result: ✅ 通过 / ❌ 失败 / ⚠️ 需关注
- Evidence: `<证据文件路径或链接>`
```

## 6.2 必须记录的事件

- 每次 `vitest run` / `pnpm test:*` 的结果
- 每次 `pnpm lint` / `pnpm typecheck` 的结果
- CI 失败及修复过程
- PR 创建和合并状态
- 任何阻塞（blocker）及处理方式

## 6.3 规则

- `Runs` 段只追加不修改（保持时间线完整）
- PR 链接在创建 PR 后必须立即回填
- `openspec-log-guard` CI check 会自动校验 RUN_LOG 的存在和基本格式

---

# 七、代码编写约定

## 7.1 通用

- 语言：TypeScript（strict mode）
- 格式化：遵循项目 ESLint + Prettier 配置
- 导入：优先使用路径别名（如 `@main/`、`@renderer/`）
- 依赖注入：被测模块应通过依赖注入接收外部依赖，便于测试

## 7.2 前端（渲染层）

- 使用 React Testing Library 测试组件行为，禁止测试 CSS 类名和 DOM 结构
- Zustand store 的 action 和 selector 独立测试
- 样式使用 Tailwind CSS 4

## 7.3 API（通信层）

- IPC 消息必须有类型定义
- 参数校验必须有对应的单元测试
- 契约测试验证前后端对消息格式的理解一致

## 7.4 后端（业务层）

- SQLite 操作使用内存数据库（`:memory:`）或 mock
- LLM API 调用必须 mock，返回预设的固定响应
- 核心算法（Token 分配、记忆衰减、图谱遍历）必须有详尽的单元测试

---

# 八、交叉验证清单

在提交 PR 前，执行以下最终检查：

- [ ]  Spec 中的每个 Scenario 都有对应的测试
- [ ]  所有测试通过（`pnpm test:unit` + `pnpm test:integration`）
- [ ]  Lint 通过（`pnpm lint`）
- [ ]  类型检查通过（`pnpm typecheck`）
- [ ]  IPC 契约检查通过（`pnpm contract:check`）
- [ ]  RUN_LOG 已创建且 PR 链接已回填
- [ ]  Commit message 格式正确：`<type>: <summary> (#<N>)`
- [ ]  PR body 包含 `Closes #<N>`
- [ ]  没有超出任务 spec 范围的代码变更
- [ ]  没有残留的 `console.log`、`TODO`、临时注释

---

本文档为 Agent 在 CreoNow 项目中执行 OpenSpec 驱动开发的操作级参考。遇到本文档未覆盖的情况，请参考 [`AGENTS.md`](http://AGENTS.md)（宪法）和 `测试规范与 TDD 指南`。