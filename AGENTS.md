# CreoNow — Agent 宪法

**CreoNow（CN）** 是一个 AI 驱动的文字创作 IDE，定位为「创作者的 Cursor」。

所有 AI Agent 在执行任何任务之前，必须先阅读本文件。违反本文件中标记为「禁止」的规则，等同于交付失败。

## 索引

| §    | 章节            | 内容                                      |
| ---- | --------------- | ----------------------------------------- |
| 一   | 规范导航        | 文档路径速查                              |
| 二   | 架构            | 四层架构 + 12 模块 Spec 路径              |
| 三   | 不可违反的规则  | Spec-First、TDD、证据落盘、门禁、变更流程 |
| 四   | 禁止行为清单    | 23 条硬禁                                 |
| 五   | 工作流程        | 接任务、开发阶段、命名约定                |
| 六   | Spec 与代码关系 | GIVEN/WHEN/THEN → AAA → 实现              |
| 七   | 测试要求速查    | 分层、覆盖率、编写规范                    |
| 八   | 技术选型约束    | 锁定技术列表                              |
| 九   | 工具链          | 包管理、构建、测试、Mock 工具             |
| 十   | 设计规范        | Design Token 引用                         |
| 十一 | 异常处理        | 遇到问题的「必须做」和「禁止做」          |
| 十二 | 代码原则        | 显式注入、JSDoc、类型完备                 |
| 十三 | 文件组织        | 源码、测试、OpenSpec 目录结构             |

---

## 一、规范导航

| #   | 文档                 | 路径                                 |
| --- | -------------------- | ------------------------------------ |
| 1   | 本文件（Agent 宪法） | `AGENTS.md`                          |
| 2   | 项目概述             | `openspec/project.md`                |
| 3   | 模块行为规范         | `openspec/specs/<module>/spec.md`    |
| 4   | 交付规则（SKILL）    | `docs/delivery-skill.md`             |
| 5   | 设计规范             | `design/DESIGN_DECISIONS.md`         |
| 6   | 任务运行日志         | `openspec/_ops/task_runs/ISSUE-N.md` |

---

## 二、架构

| 架构层         | 路径                     | 运行环境          | 包含内容                                                       |
| -------------- | ------------------------ | ----------------- | -------------------------------------------------------------- |
| 前端（渲染层） | `apps/desktop/renderer/` | Electron 渲染进程 | React 组件、TipTap 编辑器、Zustand store、UI 交互              |
| Preload        | `apps/desktop/preload/`  | Electron Preload  | contextBridge，安全暴露 IPC API                                |
| 后端（业务层） | `apps/desktop/main/`     | Electron 主进程   | 上下文引擎、知识图谱、记忆系统、技能系统、SQLite DAO、LLM 调用 |
| 共享层         | `packages/shared/`       | 跨进程            | IPC 类型定义、共享常量                                         |

### 核心引擎（后端为主）

| 模块               | 职责                                    | Spec 路径                                     |
| ------------------ | --------------------------------------- | --------------------------------------------- |
| Context Engine     | 分层上下文管理、Token 预算、Constraints | `openspec/specs/context-engine/spec.md`       |
| Knowledge Graph    | 实体与关系管理、语义检索、角色管理系统  | `openspec/specs/knowledge-graph/spec.md`      |
| Memory System      | 写作偏好学习、记忆存储与衰减            | `openspec/specs/memory-system/spec.md`        |
| Skill System       | AI 技能抽象、三级作用域、技能执行       | `openspec/specs/skill-system/spec.md`         |
| AI Service         | LLM 代理调用、流式响应、AI 面板、Judge  | `openspec/specs/ai-service/spec.md`           |
| Search & Retrieval | 全文检索、RAG、向量嵌入、语义搜索       | `openspec/specs/search-and-retrieval/spec.md` |

### 用户界面（前端为主）

| 模块          | 职责                                   | Spec 路径                                    |
| ------------- | -------------------------------------- | -------------------------------------------- |
| Editor        | TipTap 编辑器、大纲、Diff 对比、禅模式 | `openspec/specs/editor/spec.md`              |
| Workbench     | UI 外壳、布局、Surface、命令面板、设置 | `openspec/specs/workbench/spec.md`           |
| Document Mgmt | 文档 CRUD、文件树、导出                | `openspec/specs/document-management/spec.md` |
| Project Mgmt  | 项目生命周期、仪表盘、模板、引导       | `openspec/specs/project-management/spec.md`  |

### 基础设施

| 模块            | 职责                               | Spec 路径                                |
| --------------- | ---------------------------------- | ---------------------------------------- |
| IPC             | 前后端通信契约、契约自动生成与校验 | `openspec/specs/ipc/spec.md`             |
| Version Control | 快照、AI 修改标记、Diff、版本恢复  | `openspec/specs/version-control/spec.md` |

---

## 三、不可违反的规则

### 3.1 Spec-First（规范优先）

- 任何功能变更必须先有 spec，再写代码
- 收到任务后，第一步是阅读 `openspec/specs/<module>/spec.md`
- 如果 spec 不存在或不完整，必须先通过变更流程补充 spec，不得直接写代码
- 如果开发中发现 spec 遗漏的场景，必须先补充 delta spec 并通知 Owner，等确认后再实现

### 3.2 TDD（测试驱动开发）

- 测试必须先于实现：先写测试（Red）→ 写最少实现（Green）→ 重构（Refactor）
- Spec 中的每个 Scenario 必须被翻译为至少一个测试用例，不得遗漏
- 禁止先写实现再补测试
- 禁止编写永远通过的测试（空断言、断言常量等）
- 禁止为了覆盖率而编写不验证行为的测试

### 3.3 证据落盘

- 每个任务必须有 `RUN_LOG`，路径为 `openspec/_ops/task_runs/ISSUE-<N>.md`
- 关键命令的输入和输出必须记录在 RUN_LOG 的 Runs 段中
- CI 失败和修复过程必须记录
- 禁止 silent failure——异常必须有明确错误码/信息

### 3.4 门禁全绿

- PR 必须通过三个 required checks：`ci`、`openspec-log-guard`、`merge-serial`
- 所有 PR 必须启用 auto-merge，禁止手动合并
- CI 失败后必须修复再 push，不得「先合并再修」
- 交付规则文档与 GitHub branch protection 的 required checks 必须一致，不一致时必须阻断并升级

### 3.5 变更流程

- 主 spec（`openspec/specs/**/spec.md`）代表系统当前真实状态，禁止直接修改
- 所有变更必须走 **Proposal → Apply → Archive** 流程
- Delta Spec 中使用 `[ADDED]`/`[MODIFIED]`/`[REMOVED]` 标记
- 当 `openspec/changes/` 中存在 2 个及以上活跃 change（不含 `archive/` 与 `_template/`）时，必须在根目录维护 `openspec/changes/EXECUTION_ORDER.md`
- `EXECUTION_ORDER.md` 必须包含：执行模式（串行/并行）、明确顺序、依赖关系、更新时间（精确到小时和分钟，格式 `YYYY-MM-DD HH:mm`）
- 任一活跃 change 的范围/依赖/状态变更时，必须同步更新 `EXECUTION_ORDER.md`
- 若 change 在 `EXECUTION_ORDER.md` 中存在上游依赖，进入 Red 前必须完成「依赖同步检查（Dependency Sync Check）」并落盘（至少核对：数据结构、IPC 契约、错误码、阈值）
- 若依赖同步检查发现漂移，必须先更新当前 change 的 `proposal.md`、`specs/*`、`tasks.md`（必要时同步更新 `EXECUTION_ORDER.md`）并经确认后再进入 Red/Green
- 每个 `openspec/changes/<change>/tasks.md` 必须按以下固定章节顺序撰写：
  - `1. Specification`
  - `2. TDD Mapping（先测前提）`
  - `3. Red（先写失败测试）`
  - `4. Green（最小实现通过）`
  - `5. Refactor（保持绿灯）`
  - `6. Evidence`
- 若 `TDD Mapping` 未建立 Scenario→测试映射，或未记录 Red 失败证据，禁止进入实现
- PR 合并后才能将 delta spec 归档到主 spec

---

## 四、禁止行为清单

以下行为绝对禁止，违反任何一条即为交付失败。

1. 禁止跳过 spec 直接写代码
2. 禁止先写实现再补测试
3. 禁止直接修改主 spec（必须走 Proposal → Apply → Archive）
4. 禁止 silent failure（异常必须有错误码、错误信息和日志）
5. 禁止「先合并再修」（CI 不绿就不合并）
6. 禁止手动合并 PR（必须用 auto-merge）
7. 禁止测试覆盖的 Scenario 少于 spec 定义的 Scenario
8. 禁止在测试中硬编码实现细节（如依赖内部变量名、私有方法调用顺序）
9. 禁止测试之间共享可变状态
10. 禁止依赖真实时间、随机数、网络请求（使用 fake timer、固定种子、mock）
11. 禁止消耗真实 LLM API 额度（集成测试和 E2E 必须 mock）
12. 禁止 `pnpm install` 不带 `--frozen-lockfile`
13. 禁止 RUN_LOG 的 PR 字段留占位符（必须回填真实链接）
14. 禁止 silent abandonment（遇到 blocker 必须记录并通知，不得静默放弃）
15. 禁止在 Rulebook task 不存在或 validate 失败时继续实现
16. 禁止在 required checks 与交付规则文档不一致时宣称「门禁全绿」
17. 禁止仅在 `task/*` 分支提交后宣称交付完成（必须收口到控制面 `main`）
18. 禁止提交不符合固定 TDD 章节顺序的 `openspec/changes/*/tasks.md`
19. 禁止在 `openspec/changes/*/tasks.md` 缺少 Red 失败证据要求时进入实现
20. 禁止在 2 个及以上活跃 change 存在时缺失 `openspec/changes/EXECUTION_ORDER.md`
21. 禁止活跃 change 变更后未同步更新 `openspec/changes/EXECUTION_ORDER.md`
22. 禁止复用已关闭（Closed）或历史 Issue 作为新任务入口
23. 禁止在未同步最新控制面 `origin/main` 前创建 `task/*` 分支或 worktree
24. 禁止在存在上游依赖的 change 中，未完成 `依赖同步检查（Dependency Sync Check）` 即进入 Red/Green
25. 禁止在依赖漂移已发现时，未先更新 change 文档就继续实现

---

## 五、工作流程

### 5.1 接到任务时

```
1. 阅读本文件（AGENTS.md）                         ← 如已读可跳过
2. 阅读 openspec/project.md                        ← 项目概述
3. 阅读 openspec/specs/<module>/spec.md             ← 任务相关模块行为规范
4. 阅读 openspec/changes/<current>/                 ← 如有进行中的变更
5. 确认任务的 Issue 号（N）和 SLUG
6. 校验 Issue 必须为当前执行任务的 OPEN Issue（不得复用已关闭 Issue）
7. 从最新控制面 `origin/main` 创建 `task/<N>-<slug>` 与 `.worktrees/issue-<N>-<slug>`
```

### 5.2 开发流程

| 阶段          | 完成条件                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. 任务准入   | Issue 已创建或认领，N 和 SLUG 已确定                                                                                                              |
| 2. 规格制定   | spec 已编写或更新；Rulebook task 已创建并通过 validate；delta spec 已提交 Owner 审阅（如需要）；若有上游依赖则已完成 Dependency Sync Check 并落盘 |
| 3. 环境隔离   | Worktree 已创建，工作目录已切换                                                                                                                   |
| 4. 实现与测试 | 按 TDD 循环实现；所有测试通过；RUN_LOG 已记录                                                                                                     |
| 5. 提交与合并 | PR 已创建；auto-merge 已开启；三个 checks 全绿；PR 已确认合并                                                                                     |
| 6. 收口与归档 | 控制面 `main` 已包含任务提交；worktree 已清理；Rulebook task 已归档                                                                               |

### 5.3 命名约定

| 实体     | 格式                                   | 示例                               |
| -------- | -------------------------------------- | ---------------------------------- |
| Branch   | `task/<N>-<slug>`                      | `task/42-memory-decay`             |
| Commit   | `<type>: <summary> (#<N>)`             | `feat: add memory decay (#42)`     |
| PR title | `<title> (#<N>)`                       | `Add memory decay (#42)`           |
| PR body  | 必须包含 `Closes #<N>`                 | `Closes #42`                       |
| RUN_LOG  | `openspec/_ops/task_runs/ISSUE-<N>.md` | `ISSUE-42.md`                      |
| Worktree | `.worktrees/issue-<N>-<slug>`          | `.worktrees/issue-42-memory-decay` |

Commit type 可选值：`feat`、`fix`、`refactor`、`test`、`docs`、`chore`、`ci`

---

## 六、Spec 与代码的关系

```
Spec Scenario          →  测试用例             →  实现代码
─────────────────────────────────────────────────────────
GIVEN（前置条件）      →  Arrange（准备）       →  被测模块的依赖
WHEN（触发动作）       →  Act（执行）           →  被测模块的接口
THEN（期望结果）       →  Assert（验证）        →  被测模块的行为
```

同步规则：

- Spec 新增 Scenario → 必须新增对应测试
- Spec 修改 Scenario → 必须同步修改对应测试
- Spec 删除 Scenario → 必须同步删除对应测试
- 开发中发现 spec 遗漏 → 先补 delta spec + 通知 Owner → 等确认后再实现

---

## 七、测试要求速查

### 7.1 测试分层

| 层级     | 运行时机    | 速度要求       | 外部依赖                      |
| -------- | ----------- | -------------- | ----------------------------- |
| 单元测试 | 每次保存    | 全套 30 秒内   | 全部 mock                     |
| 集成测试 | 每次提交    | 全套 2 分钟内  | SQLite 内存 OK，LLM 必须 mock |
| E2E 测试 | 每次合并    | 全套 10 分钟内 | LLM 用 mock server            |
| AI Eval  | Prompt 变更 | 取决于 API     | 真实 LLM，手动触发            |

### 7.2 覆盖率要求

| 模块类别                                   | 最低覆盖率 |
| ------------------------------------------ | ---------- |
| 核心业务逻辑（Context Engine、KG、Memory） | 90%        |
| 一般业务模块（DAO、Skill、Version）        | 80%        |
| UI 组件和胶水代码                          | 60%        |

### 7.3 测试编写规范

- 命名：`it('should <期望行为> when <前置条件>')`
- 结构：严格 AAA（Arrange-Act-Assert），段间空行分隔
- 独立性：每个测试独立运行，不依赖执行顺序，不共享可变状态
- 确定性：同一测试在同一代码上运行 N 次，结果完全相同
- 断言：每个测试至少一个有意义的断言，优先使用具体断言

---

## 八、技术选型约束

以下技术已锁定，禁止替换：

| 技术           | 用途         |
| -------------- | ------------ |
| React 18       | 前端框架     |
| TypeScript     | 类型系统     |
| Vite           | 构建工具     |
| Tailwind CSS 4 | 样式         |
| Radix UI       | 组件原语     |
| TipTap 2       | 富文本编辑器 |
| Zustand        | 状态管理     |
| Electron       | 桌面框架     |
| SQLite         | 本地数据库   |

如需变更技术选型，必须先提交 RFC 并获得批准。

---

## 九、工具链

| 用途     | 工具                           | 说明                         |
| -------- | ------------------------------ | ---------------------------- |
| 包管理   | pnpm 8                         | 必须使用 `--frozen-lockfile` |
| 构建     | Vite（via electron-vite）      | —                            |
| 测试框架 | Vitest                         | 兼容 Jest API                |
| 组件测试 | React Testing Library          | 测试行为而非实现             |
| E2E      | Playwright                     | 支持 Electron                |
| Mock     | Vitest 内置（vi.mock / vi.fn） | —                            |
| 样式     | Tailwind CSS 4                 | 原子化 CSS                   |
| 状态管理 | Zustand                        | —                            |
| 本地存储 | SQLite                         | 测试中使用 `:memory:`        |

---

## 十、设计规范

- 设计基准：`design/DESIGN_DECISIONS.md`
- 所有 UI 实现必须严格遵循设计规范，禁止偏移
- 颜色、间距、字体必须使用 Design Token

---

## 十一、异常处理

| 遇到的情况                           | 必须做                                                                                                   | 禁止做                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------- |
| Spec 不存在或不完整                  | 通知 Owner，请求补充 spec                                                                                | 根据猜测直接写代码         |
| 开发中发现 spec 遗漏场景             | 写 delta spec 补充 → 通知 Owner → 等确认                                                                 | 只写测试不更新 spec        |
| 上游依赖产出与当前 change 假设不一致 | 先做 Dependency Sync Check 并记录 → 更新 proposal/spec/tasks（必要时更新 EXECUTION_ORDER）→ 经确认后继续 | 跳过更新直接进入 Red/Green |
| `gh` 命令超时                        | 重试 3 次（间隔 10s），仍失败 → 记录 RUN_LOG → 升级                                                      | 静默忽略                   |
| PR 需要 review                       | 记录 blocker → 通知 reviewer → 等待                                                                      | 静默放弃                   |
| CI 失败                              | 修复 → push → 再次 watch → 写入 RUN_LOG                                                                  | 先合并再修                 |
| Rulebook task 不存在或 validate 失败 | 阻断交付，先修复 Rulebook 再继续                                                                         | 跳过 Rulebook 直接实现     |
| 非 `task/*` 分支提交 PR              | PR body 必须包含 `Skip-Reason:`                                                                          | 不说明原因直接跳过 RUN_LOG |
| required checks 与交付规则文档不一致 | 阻断交付并升级治理，先完成对齐                                                                           | 继续宣称门禁全绿           |
| 任务超出 spec 范围                   | 先补 spec → 经 Owner 确认后再做                                                                          | 超范围自由发挥             |
| 误用已关闭/历史 Issue                | 立即停止实现 → 新建 OPEN Issue → 从最新 `origin/main` 重建 worktree → 记录 RUN_LOG                       | 继续沿用旧 Issue 开发      |
| RUN_LOG 的 PR 字段为占位符           | 先回填真实 PR 链接再宣称交付完成                                                                         | 带占位符进入合并流程       |

---

## 十二、代码原则

- 拒绝隐式注入：所有依赖必须显式传入
- 一条链路一套实现：禁止「向后兼容/双栈并存」
- 不写非必要代码：禁止过度抽象；先跑通最短链路再扩展
- 显式注释：新增/修改的函数必须有 JSDoc；注释只解释 why，不写 what
- 禁止 `any` 类型；类型必须完备（TS 严格模式下可编译）
- IPC 边界必须返回可判定结果（`ok: true | false`）
- 禁止 silent failure：任何 `catch` 必须显式处理
- 超时/取消必须有明确状态

---

## 十三、文件组织

### 源码

```
apps/desktop/
├── main/src/               ← 后端（Electron 主进程）
├── preload/src/            ← Preload 脚本
├── renderer/src/           ← 前端（Electron 渲染进程）
└── tests/                  ← 测试
```

### 测试

```
apps/desktop/**/*.test.ts   ← 单元测试（与源文件并置）
tests/
├── integration/            ← 集成测试
├── e2e/                    ← 端到端测试
└── ai-eval/                ← AI 输出质量测试
    └── golden-tests/
```

### OpenSpec

```
openspec/
├── project.md              ← 项目概述（Agent 第二入口）
├── specs/                  ← 主规范（Source of Truth）
│   └── <module>/spec.md
├── changes/                ← 进行中的变更（Delta Specs）
│   ├── EXECUTION_ORDER.md  ← 多活跃 change 的执行顺序文档（>=2 时必需）
│   ├── _template/          ← change 撰写模板（含固定 TDD tasks 结构）
│   └── <change-name>/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/<module>/spec.md
└── _ops/
    └── task_runs/          ← RUN_LOGs
```

---

**读完本文件后，请阅读 `openspec/project.md`，然后阅读任务相关模块的 `spec.md`，再开始工作。**
