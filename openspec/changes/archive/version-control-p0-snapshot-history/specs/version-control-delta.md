# Version Control Specification Delta

## Change: version-control-p0-snapshot-history

### Requirement: 版本快照生成与存储 [ADDED]

系统必须在以下时机自动生成文档版本快照：

| 触发时机 | actor | reason |
|---|---|---|
| 用户手动保存（Cmd/Ctrl+S） | `user` | `manual-save` |
| 自动保存（debounce 500ms） | `auto` | `autosave` |
| AI 修改被用户接受后 | `ai` | `ai-accept` |
| 文档状态变更（草稿↔定稿） | `user` | `status-change` |

- 快照数据结构：`id`、`documentId`、`projectId`、`content`（TipTap JSON）、`actor`、`reason`、`wordCount`、`createdAt`。
- IPC 通道：`version:snapshot:create`、`version:snapshot:list`、`version:snapshot:read`（均为 Request-Response）。
- 自动保存版本合并策略：5 分钟时间窗口内 autosave 合并为 1 个，保留最新内容；手动保存和 AI 修改的快照不参与合并。

#### Scenario: 用户手动保存生成版本快照 [ADDED]

- **假设** 用户正在编辑文档「第三章」
- **当** 用户按下 `Cmd/Ctrl+S`
- **则** 通过 `version:snapshot:create` 创建快照，actor 为 `user`，reason 为 `manual-save`
- **并且** 版本历史列表新增一条记录

#### Scenario: AI 修改被接受后生成版本快照 [ADDED]

- **假设** 用户通过 Inline Diff 接受了 AI 润色结果
- **当** AI 修改应用到文档
- **则** 自动创建版本快照，actor 为 `ai`，reason 为 `ai-accept`
- **并且** 该快照在版本历史中可追溯

#### Scenario: 自动保存版本合并 [ADDED]

- **假设** 用户在 3 分钟内连续编辑触发了 15 次 autosave
- **当** 系统执行版本合并策略
- **则** 5 分钟时间窗口内的 autosave 快照合并为 1 个
- **并且** 保留最新的 autosave 内容作为合并后的快照

### Requirement: 版本历史入口与展示 [ADDED]

系统必须提供专门的版本管理入口。

- 入口：右键文档菜单「版本历史」、Info 面板「查看版本历史」链接、命令面板搜索。
- 时间线列表：时间戳、actor 标识（人物/时钟/AI 图标）、reason 描述、字数变化（+N / -N）。
- 按时间降序排列。
- 版本历史面板必须有 Storybook Story（多版本默认态 / 单版本最简态 / 加载态）。

#### Scenario: 用户打开版本历史 [ADDED]

- **假设** 文档「第三章」有 20 个历史版本
- **当** 用户通过右键菜单选择「版本历史」
- **则** 版本历史面板打开，显示时间线列表
- **并且** 每条记录标注 actor 类型和字数变化

#### Scenario: 版本历史中的 actor 标识 [ADDED]

- **假设** 版本历史中有用户手动保存、自动保存和 AI 修改的混合记录
- **当** 面板渲染版本列表
- **则** 用户手动保存显示人物图标、自动保存显示时钟图标、AI 修改显示 AI 图标

## Out of Scope

- AI 修改区分显示（→ version-control-p1）
- 版本预览（→ version-control-p1）
- 版本 Diff 对比（→ version-control-p2）
- 版本回滚（→ version-control-p2）
- 分支管理（→ version-control-p3）
