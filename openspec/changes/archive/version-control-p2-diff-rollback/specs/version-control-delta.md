# Version Control Specification Delta

## Change: version-control-p2-diff-rollback

### Requirement: 版本对比（Diff）[ADDED]

用户必须能够选择两个版本进行 Diff 对比，复用 Editor 模块的 `DiffViewPanel` 和 `MultiVersionCompare` 组件。

- 入口：版本历史中「与当前版本对比」、选中两版本后「对比选中版本」。
- 通过 `version:snapshot:diff`（Request-Response）获取 diff 数据（命名遵循三段式 channel 治理）。
- Diff 着色遵循 Editor spec：删除 `--color-error-subtle`，新增 `--color-success-subtle`。
- 支持 Unified / Split 模式和最多 4 版本同时对比（2×2 网格）。
- 同步滚动支持。
- 两版本内容相同时显示「无差异」。

#### Scenario: 用户对比历史版本与当前版本 [ADDED]

- **假设** 用户在版本历史中选中「3 天前」的版本
- **当** 用户点击「与当前版本对比」
- **则** 通过 `version:snapshot:diff` 获取差异
- **并且** `DiffViewPanel` 渲染删除和新增内容
- **并且** 底部统计显示变化行数

#### Scenario: 两个版本内容完全相同 [ADDED]

- **假设** 用户选择两个连续的自动保存版本（内容未变）
- **当** Diff 面板渲染
- **则** 显示「无差异」提示
- **并且** 统计显示「+0 行，-0 行」

### Requirement: 版本回滚 [ADDED]

用户必须能够将文档恢复到任意历史版本。回滚操作创建新版本而非删除历史。

- 入口：版本历史面板或预览模式中「恢复到此版本」按钮。
- 确认对话框：「将文档恢复到 [时间] 的版本？当前内容将被保存为新版本。」
- 回滚三步流程：① 当前内容 → `pre-rollback` 快照 → ② 目标版本设为当前 → ③ `rollback` 快照。
- 通过 `version:snapshot:rollback`（Request-Response）完成。
- 可撤销：中间版本不删除，用户可再次回滚到 `pre-rollback`。
- 取消确认时不创建任何快照。
- 开启 AI 修改区分时，Diff 中 AI 修改使用虚线下划线渲染。

#### Scenario: 用户回滚到历史版本 [ADDED]

- **假设** 用户在预览「5 天前」的版本
- **当** 用户点击「恢复到此版本」并确认
- **则** 先保存当前内容为 `pre-rollback` 快照
- **并且** 将「5 天前」版本内容设为当前文档
- **并且** 创建 `rollback` 快照
- **并且** 编辑器显示恢复后的内容

#### Scenario: 回滚后再次回滚（可撤销的回滚）[ADDED]

- **假设** 用户刚回滚到「5 天前」的版本
- **当** 用户在版本历史找到 `pre-rollback` 快照并再次回滚
- **则** 文档恢复到回滚前的状态

#### Scenario: 回滚确认被取消 [ADDED]

- **假设** 系统弹出回滚确认对话框
- **当** 用户点击「取消」
- **则** 对话框关闭，文档内容不变
- **并且** 不创建任何新版本快照

## Out of Scope

- 分支管理（→ version-control-p3）
- 不重新实现 Diff 组件（复用 Editor 模块）
- 批量回滚
