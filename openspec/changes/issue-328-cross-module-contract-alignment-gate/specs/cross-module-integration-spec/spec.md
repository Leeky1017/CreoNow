# Cross Module Integration Specification Delta

## Change: issue-328-cross-module-contract-alignment-gate

### Requirement: Cross-module 契约自动门禁 [ADDED]

系统必须提供可机器执行的 cross-module 契约对齐门禁，用于阻止“未登记漂移”进入主分支。该门禁至少校验：

- 关键通道存在性（含 alias 漂移登记）；
- 错误码基线存在性（含临时缺口登记）；
- 统一响应 envelope 语义（含临时漂移登记）；
- 漂移登记项是否陈旧（实现已对齐后必须删除漂移例外）。

#### Scenario: 已登记漂移可通过 [ADDED] (S1)

- **假设** 某通道存在已批准的 alias 漂移登记
- **当** 执行 `cross-module:check`
- **则** 门禁通过
- **并且** 输出该漂移已被登记的证据

#### Scenario: 未登记漂移必须失败 [ADDED] (S2)

- **假设** 关键通道在当前契约中缺失且没有登记漂移例外
- **当** 执行 `cross-module:check`
- **则** 门禁失败
- **并且** 输出缺失条目与修复路径

#### Scenario: 漂移条目陈旧必须失败 [ADDED] (S3)

- **假设** 某漂移例外条目对应的实现已恢复对齐
- **当** 执行 `cross-module:check`
- **则** 门禁失败
- **并且** 提示删除陈旧例外，防止漂移白名单无限增长

### Requirement: 门禁接线必须覆盖本地与 CI [ADDED]

Cross-module 契约门禁必须在以下路径同时生效：

- 本地提交前预检（`agent_pr_preflight.py`）
- GitHub CI（聚合到 `ci` required check 内）

#### Scenario: preflight 未执行 cross-module:check 触发阻断 [ADDED] (S4)

- **假设** preflight 运行时未包含 cross-module 校验
- **当** 执行本地交付预检
- **则** 交付流程视为不完整并阻断

#### Scenario: CI 未执行 cross-module:check 触发阻断 [ADDED] (S5)

- **假设** CI 流程缺少 cross-module 校验步骤
- **当** 变更触发 PR 门禁
- **则** 不得宣称跨模块契约已被自动保护
