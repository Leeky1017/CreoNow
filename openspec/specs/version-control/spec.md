# Version Control Specification

## Purpose

管理写作版本：快照生成与存储、AI 修改标记（actor=ai）、任意两版本 Diff 对比、一键恢复历史版本。

### Scope

| Layer    | Path                                     |
| -------- | ---------------------------------------- |
| Backend  | `main/src/services/version/`             |
| IPC      | `main/src/ipc/version.ts`                |
| Frontend | `renderer/src/features/version-history/` |
| Store    | `renderer/src/stores/versionStore.tsx`   |

## Requirements

### Requirement: 版本快照生成与存储

系统**必须**在以下时机自动生成文档版本快照：

| 触发时机                   | actor  | reason          |
| -------------------------- | ------ | --------------- |
| 用户手动保存（Cmd/Ctrl+S） | `user` | `manual-save`   |
| 自动保存（debounce 500ms） | `auto` | `autosave`      |
| AI 修改被用户接受后        | `ai`   | `ai-accept`     |
| 文档状态变更（草稿↔定稿）  | `user` | `status-change` |

每个版本快照**必须**包含：`id`、`documentId`、`projectId`、`content`（TipTap JSON 完整内容）、`actor`（`user` | `auto` | `ai`）、`reason`、`wordCount`、`createdAt`。

版本快照通过以下 IPC 通道管理：

| IPC 通道                  | 通信模式         | 方向            | 用途               |
| ------------------------- | ---------------- | --------------- | ------------------ |
| `version:snapshot:create` | Request-Response | Renderer → Main | 创建版本快照       |
| `version:snapshot:list`   | Request-Response | Renderer → Main | 列出文档的版本历史 |
| `version:snapshot:read`   | Request-Response | Renderer → Main | 读取某个版本内容   |

为控制存储空间，系统**应该**对高频自动保存版本进行合并（如 5 分钟内的多次 autosave 合并为一个快照），保留用户手动保存和 AI 修改的所有快照。

#### Scenario: 用户手动保存生成版本快照

- **假设** 用户正在编辑文档「第三章」
- **当** 用户按下 `Cmd/Ctrl+S`
- **则** 系统通过 `version:snapshot:create` 创建快照，actor 为 `user`，reason 为 `manual-save`
- **并且** 版本历史列表新增一条记录

#### Scenario: AI 修改被接受后生成版本快照

- **假设** 用户通过 Inline Diff 接受了 AI 的润色结果
- **当** AI 修改应用到文档
- **则** 系统自动创建版本快照，actor 为 `ai`，reason 为 `ai-accept`
- **并且** 该快照在版本历史中可追溯

#### Scenario: 自动保存版本合并

- **假设** 用户在 3 分钟内连续编辑触发了 15 次 autosave
- **当** 系统执行版本合并策略
- **则** 5 分钟时间窗口内的 autosave 快照合并为 1 个
- **并且** 保留最新的 autosave 内容作为合并后的快照

---

### Requirement: 版本历史入口与展示

系统**必须**提供专门的版本管理入口，不作为隐藏功能。

版本历史入口：

- 右键文档菜单中的「版本历史」选项
- Info 面板中的「查看版本历史」链接
- 快捷操作（命令面板中搜索「版本历史」）

版本历史以**时间线列表**形式在专用面板中展示：

- 每条版本记录显示：时间戳、actor 标识（用户/自动/AI）、reason 描述、字数变化（+N / -N）
- 列表按时间降序排列（最新在上）
- actor 标识使用不同图标区分：用户操作（人物图标）、自动保存（时钟图标）、AI 修改（AI 图标）

版本历史面板组件**必须**有 Storybook Story，覆盖：有多个版本的默认态、仅一个版本的最简态、加载态。

#### Scenario: 用户打开版本历史

- **假设** 文档「第三章」有 20 个历史版本
- **当** 用户通过右键菜单选择「版本历史」
- **则** 版本历史面板打开，显示时间线列表
- **并且** 每条记录标注 actor 类型和字数变化

#### Scenario: 版本历史中的 actor 标识

- **假设** 版本历史中有用户手动保存、自动保存和 AI 修改的混合记录
- **当** 面板渲染版本列表
- **则** 用户手动保存项显示人物图标
- **并且** 自动保存项显示时钟图标
- **并且** AI 修改项显示 AI 图标

---

### Requirement: AI 修改标记与区分显示

AI 的修改和用户的修改**默认不区分**显示。用户**可以**在设置中选择开启区分显示。

开启区分显示后：

- 版本历史中 AI 生成的版本标注「AI 修改」标签（使用 `--color-info` 背景）
- Diff 对比中，AI 修改的内容使用虚线下划线标记，与用户修改的实线下划线区分

区分显示偏好持久化到 `creonow.editor.showAiMarks`。

#### Scenario: 用户开启 AI 修改区分显示

- **假设** 用户在设置中开启「区分 AI 修改」选项
- **当** 用户查看版本历史
- **则** AI 生成的版本记录额外显示「AI 修改」标签
- **并且** 在 Diff 对比中，AI 修改的部分使用虚线下划线

#### Scenario: 默认模式不区分 AI 修改

- **假设** 用户未开启「区分 AI 修改」选项（默认）
- **当** 用户查看版本历史
- **则** 所有版本记录统一显示，不特殊标注 AI 修改

---

### Requirement: 版本预览

用户**必须**能够点击任意历史版本进行只读预览。

预览行为：

- 点击版本记录后，主编辑区切换为只读预览模式
- 预览模式顶部显示提示条：「正在预览 [时间] 的版本」+ 「恢复到此版本」按钮 + 「返回当前版本」按钮
- 提示条使用 `--color-bg-raised` 背景，`--color-border-default` 下边框
- 预览模式下编辑器工具栏禁用，不可编辑

#### Scenario: 用户预览历史版本

- **假设** 版本历史面板显示多个版本
- **当** 用户点击「2 小时前」的版本记录
- **则** 编辑区切换为只读模式，显示该版本的内容
- **并且** 顶部提示条显示「正在预览 2 小时前的版本」
- **并且** 编辑器工具栏按钮全部禁用

#### Scenario: 用户从预览返回当前版本

- **假设** 用户正在预览历史版本
- **当** 用户点击提示条中的「返回当前版本」
- **则** 编辑区恢复为当前版本内容
- **并且** 提示条消失，编辑器恢复可编辑状态

---

### Requirement: 版本对比（Diff）

用户**必须**能够选择两个版本进行 Diff 对比。对比功能**必须**复用 Editor 模块的 `DiffViewPanel` 和 `MultiVersionCompare` 组件。

对比入口：

- 版本历史面板中选中一个版本后，点击「与当前版本对比」
- 或选中两个版本后点击「对比选中版本」

对比行为遵循 Editor spec 中「Diff 对比模式」需求的所有规范：

- 删除内容使用 `--color-error-subtle` 背景 + 红色删除线
- 新增内容使用 `--color-success-subtle` 背景 + 绿色文字
- 支持统一视图（Unified）和分栏视图（Split）
- 支持最多 4 个版本同时对比（`MultiVersionCompare` 2×2 网格）
- 支持同步滚动

版本对比通过 IPC 通道 `version:diff`（Request-Response）获取 diff 数据。

#### Scenario: 用户对比历史版本与当前版本

- **假设** 用户在版本历史中选中「3 天前」的版本
- **当** 用户点击「与当前版本对比」
- **则** 系统通过 `version:diff` 获取两个版本的差异
- **并且** `DiffViewPanel` 渲染，显示删除和新增内容
- **并且** 底部统计显示变化行数

#### Scenario: 两个版本内容完全相同

- **假设** 用户选择两个连续的自动保存版本（内容未变）
- **当** Diff 面板渲染
- **则** 显示「无差异」提示
- **并且** 统计显示「+0 行，-0 行」

---

### Requirement: 版本回滚

用户**必须**能够将文档恢复到任意历史版本。回滚操作**必须**安全——创建新版本作为恢复点，而非删除中间版本。

回滚流程：

1. 用户在版本历史或预览模式中点击「恢复到此版本」
2. 系统弹出确认对话框：「将文档恢复到 [时间] 的版本？当前内容将被保存为新版本。」
3. 用户确认后：
   a. 系统先将当前内容创建为新版本快照（actor: `user`，reason: `pre-rollback`）
   b. 再将目标版本的内容设置为当前文档内容
   c. 再创建一个恢复版本快照（actor: `user`，reason: `rollback`）
4. 编辑器加载恢复后的内容

回滚通过 IPC 通道 `version:rollback`（Request-Response）完成。

回滚操作本身可撤销——因为中间版本未被删除，用户可以再次回滚到回滚前的版本。

#### Scenario: 用户回滚到历史版本

- **假设** 用户在预览「5 天前」的版本
- **当** 用户点击「恢复到此版本」并确认
- **则** 系统先保存当前内容为 `pre-rollback` 快照
- **并且** 将「5 天前」版本的内容设置为当前文档
- **并且** 创建 `rollback` 快照
- **并且** 编辑器显示恢复后的内容，可正常编辑

#### Scenario: 回滚后再次回滚（可撤销的回滚）

- **假设** 用户刚回滚到「5 天前」的版本
- **当** 用户发现回滚错误，打开版本历史找到 `pre-rollback` 快照
- **则** 用户可以再次回滚到 `pre-rollback` 版本
- **并且** 文档恢复到回滚前的状态

#### Scenario: 回滚确认被取消

- **假设** 系统弹出回滚确认对话框
- **当** 用户点击「取消」
- **则** 对话框关闭，文档内容不变
- **并且** 不创建任何新版本快照

---

### Requirement: 分支管理、合并与冲突解决

版本系统必须支持文档级分支工作流，覆盖分支创建、切换、合并和冲突解决全链路。

分支模型：

- 每个文档默认存在 `main` 分支
- 分支命名规则：`[a-z0-9-]{3,32}`，同文档内唯一
- 分支元数据：`id`、`documentId`、`name`、`baseSnapshotId`、`headSnapshotId`、`createdBy`、`createdAt`

分支 IPC 通道：

| IPC 通道                   | 通信模式         | 方向            | 用途             |
| -------------------------- | ---------------- | --------------- | ---------------- |
| `version:branch:create`    | Request-Response | Renderer → Main | 创建分支         |
| `version:branch:list`      | Request-Response | Renderer → Main | 列出分支         |
| `version:branch:switch`    | Request-Response | Renderer → Main | 切换分支         |
| `version:branch:merge`     | Request-Response | Renderer → Main | 合并分支         |
| `version:conflict:resolve` | Request-Response | Renderer → Main | 提交冲突解决结果 |

合并策略：

- 默认三方合并（base / source / target）
- 无冲突时自动合并并生成 `reason=branch-merge` 快照
- 有冲突时返回冲突块列表，禁止自动落盘
- 单次合并超时阈值 5s，超时返回 `VERSION_MERGE_TIMEOUT`

#### Scenario: 创建分支并无冲突合并

- **假设** 用户在 `main` 分支基础上创建 `alt-ending`
- **当** 用户在 `alt-ending` 完成修改并触发合并到 `main`
- **则** 系统通过 `version:branch:merge` 执行三方合并
- **并且** 无冲突时自动提交合并结果
- **并且** 版本历史新增 `reason=branch-merge` 快照

#### Scenario: 合并冲突进入人工解决流程

- **假设** `main` 与 `alt-ending` 同时修改同一段落
- **当** 用户执行合并
- **则** 系统返回 `CONFLICT` 与冲突块列表
- **并且** Diff 面板进入冲突解决模式（逐块选取 ours/theirs/manual）
- **当** 用户提交解决结果
- **则** 系统通过 `version:conflict:resolve` 落盘并生成合并快照

---

### Requirement: 模块级可验收标准（适用于本模块全部 Requirement）

本模块全部 Requirement 的统一可验收标准如下：

- 量化阈值：
  - 快照写入 p95 < 120ms
  - 历史列表查询 p95 < 200ms
  - 两版本 Diff 计算 p95 < 350ms
  - 分支合并（无冲突）p95 < 900ms
- 边界与类型安全：
  - `TypeScript strict` 必须开启
  - `version:*`/`version:branch:*`/`version:conflict:*` 通道必须由 zod 校验
- 失败处理策略：
  - 数据一致性相关失败一律硬失败并阻断（不静默降级）
  - 可重试 IO 失败最多重试 3 次，超时 5s
  - 失败后返回结构化错误并记录 rollback checkpoint
- Owner 决策边界：
  - actor/reason 枚举、快照不可变性、回滚语义由 Owner 固定
  - Agent 不得引入“覆盖历史”的删除式回滚

#### Scenario: 快照与 Diff 指标达标

- **假设** 文档大小 30,000 字，历史版本 500 条
- **当** 连续执行 100 次快照与 100 次 Diff
- **则** 快照写入 p95 < 120ms
- **并且** Diff 计算 p95 < 350ms

#### Scenario: 数据库故障时保持可恢复状态

- **假设** 快照写入中途 SQLite 抛错
- **当** 主进程处理异常
- **则** 返回 `{ code: "DB_ERROR", message: "版本写入失败" }`
- **并且** 文档保持写前状态且存在可回滚检查点

---

### Requirement: 异常与边界覆盖矩阵

| 类别         | 最低覆盖要求                                 |
| ------------ | -------------------------------------------- |
| 网络/IO 失败 | 快照写入失败、历史读取失败、合并结果写入失败 |
| 数据异常     | 快照损坏、Diff 输入非法、分支 head 缺失      |
| 并发冲突     | 同文档双分支并发合并、并发回滚               |
| 容量溢出     | 单文档快照超过 50,000 条                     |
| 权限/安全    | 非当前项目分支访问、跨项目快照读取越权       |

#### Scenario: 并发合并触发串行锁

- **假设** 两个请求同时将不同分支合并到 `main`
- **当** 请求同时到达主进程
- **则** 系统按 `documentId` 加锁串行执行
- **并且** 后到请求读取前一次合并后的最新 head 再计算

#### Scenario: 快照容量超限自动压缩

- **假设** 单文档快照数量达到 50,001
- **当** 新快照写入
- **则** 系统自动压缩 7 天前 autosave 快照并保留手动/AI/回滚快照
- **并且** 返回 `VERSION_SNAPSHOT_COMPACTED` 事件供 UI 展示

---

### Non-Functional Requirements

**Performance**

- `version:snapshot:create`：p50 < 60ms，p95 < 120ms，p99 < 250ms
- `version:snapshot:list`：p50 < 80ms，p95 < 200ms，p99 < 400ms
- `version:branch:merge`（无冲突）：p50 < 450ms，p95 < 900ms，p99 < 1.5s

**Capacity**

- 单文档快照上限：50,000（超限自动压缩 autosave）
- 单文档分支上限：128
- 单次 Diff 最大输入：2 MB 文本（超限需分块）

**Security & Privacy**

- 快照内容必须按项目隔离存储，禁止跨项目读取
- 日志中仅记录 `snapshotId/documentId`，禁止记录正文原文
- 冲突解决结果必须记录操作人和时间戳用于审计

**Concurrency**

- 同一 `documentId` 的 merge/rollback/snapshot 操作必须串行
- 跨文档操作可并行，最大并发 8
- 并发回滚冲突返回 `VERSION_ROLLBACK_CONFLICT`

#### Scenario: 多文档并行版本操作

- **假设** 8 个文档同时触发快照
- **当** 版本服务并行处理
- **则** 所有请求在 p95 阈值内完成
- **并且** 各文档快照序列保持单调递增

#### Scenario: 超大 Diff 输入分块处理

- **假设** 用户对比两版总文本 3 MB
- **当** 触发 `version:diff`
- **则** 系统返回 `{ code: "VERSION_DIFF_PAYLOAD_TOO_LARGE" }` 并提示启用分块对比
- **并且** 不发生主进程崩溃或 UI 卡死
