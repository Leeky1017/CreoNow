# Cross Module Integration Specification Delta

## Change: issue-330-cross-module-gate-autofix-classification

### Requirement: Cross-module 失败项必须可分类 [ADDED]

当 `cross-module:check` 失败时，系统必须输出机器可判定分类，至少包含：

- `IMPLEMENTATION_ALIGNMENT_REQUIRED`：expected 契约缺失或语义不一致，应修实现/契约位置；
- `NEW_CONTRACT_ADDITION_CANDIDATE`：实现出现未登记契约项，疑似新增能力，应先补 delta spec 与 baseline；
- `SAFE_BASELINE_CLEANUP`：已恢复对齐但 baseline 残留例外，可自动清理。

#### Scenario: 缺失 expected 项必须归类为实现对齐修复 [ADDED] (S1)

- **假设** `expectedChannels` 中存在未命中的必需通道
- **当** 执行失败分类
- **则** 返回 `IMPLEMENTATION_ALIGNMENT_REQUIRED`
- **并且** 给出应修对象（channel/error/envelope）

#### Scenario: 出现未登记新增项必须归类为新增候选 [ADDED] (S2)

- **假设** 实际契约出现 baseline 未声明的新 channel 或 error code
- **当** 执行失败分类
- **则** 返回 `NEW_CONTRACT_ADDITION_CANDIDATE`
- **并且** 提示先补 delta spec 与 baseline 再实现

### Requirement: 开发分支支持安全自动修复与自动提交 [ADDED]

系统必须提供开发分支命令 `cross-module:autofix`，用于：

- 自动清理 `SAFE_BASELINE_CLEANUP` 条目；
- 在 `task/<N>-<slug>` 分支、且显式指定 `--commit` 时自动提交修复 commit。

#### Scenario: 陈旧漂移自动清理并可通过门禁 [ADDED] (S3)

- **假设** baseline 中存在 stale alias / stale missing / stale envelope drift
- **当** 执行 `cross-module:autofix --apply`
- **则** 自动删除陈旧例外
- **并且** 再次执行 `cross-module:check` 时不再因陈旧条目失败

#### Scenario: 开发分支启用 --commit 自动提交 [ADDED] (S4)

- **假设** 当前分支为 `task/<N>-<slug>` 且 autofix 产生文件变更
- **当** 执行 `cross-module:autofix --apply --commit`
- **则** 自动创建新 commit
- **并且** commit message 包含 `(#<N>)`

#### Scenario: 无可自动修复项时不得伪提交 [ADDED] (S5)

- **假设** 门禁失败但没有可自动修复项
- **当** 执行 `cross-module:autofix --apply --commit`
- **则** 不创建 commit
- **并且** 以失败退出并输出人工修复提示

### Requirement: CI 继续保持只校验模式 [ADDED]

CI required checks 必须继续只执行 `cross-module:check`，不得引入自动改写行为。

#### Scenario: CI 不执行 autofix [ADDED] (S6)

- **假设** PR 触发 CI
- **当** 执行跨模块门禁
- **则** 仅运行 `cross-module:check`
- **并且** 不执行 `cross-module:autofix`
