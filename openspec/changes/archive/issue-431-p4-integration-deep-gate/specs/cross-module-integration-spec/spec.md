# Cross Module Integration Specification Delta

## Change: issue-431-p4-integration-deep-gate

### Requirement: P4 归档后必须通过深度集成门禁复核 [ADDED]

系统必须在 P4 change 归档后，基于最新控制面基线执行完整跨模块门禁，并产出可追溯证据。

#### Scenario: 固定顺序门禁执行并记录结果 [ADDED] (S1)

- **假设** P4 相关 change 已归档且控制面基线已同步
- **当** 执行 `typecheck -> lint -> contract:check -> cross-module:check -> test:unit -> test:integration`
- **则** 每个命令均记录退出码与关键输出
- **并且** 形成可审计证据写入 RUN_LOG

### Requirement: 失败项必须完成标准化分类与处置 [ADDED]

当门禁出现失败项时，必须为每项失败给出分类与后续动作，禁止未分类修复。

#### Scenario: 失败项按三分类输出 [ADDED] (S2)

- **假设** 门禁出现跨模块契约或行为失败
- **当** 对失败项进行分析
- **则** 每项失败被归类为 `IMPLEMENTATION_ALIGNMENT_REQUIRED` / `NEW_CONTRACT_ADDITION_CANDIDATE` / `SAFE_BASELINE_CLEANUP`
- **并且** 为每项提供 owner、next action 与 evidence path

### Requirement: 实现对齐类问题必须按 TDD 修复 [ADDED]

归类为 `IMPLEMENTATION_ALIGNMENT_REQUIRED` 的问题必须经过 Red→Green→Refactor，且每个修复项具备失败与通过证据。

#### Scenario: 修复项具备 Red/Green 闭环证据 [ADDED] (S3)

- **假设** 某失败项被分类为实现对齐问题
- **当** 执行修复
- **则** 先出现可重复的失败测试（Red）
- **并且** 最小实现后测试转绿（Green）
- **并且** 回归门禁不引入新失败

### Requirement: P4 关键集成用例必须纳入标准门禁脚本 [ADDED]

`test:integration` 脚本必须覆盖 P4 关键跨模块集成用例，防止“存在测试但未纳入门禁”的假绿状态。

#### Scenario: test:integration 覆盖 P4 关键集成用例 [ADDED] (S4)

- **假设** 仓库存在 P4 关键集成测试（技能并发队列、项目切换自动保存、AI 聊天容量保护、替换-版本快照链路）
- **当** 执行 `pnpm test:integration`
- **则** 上述关键测试均被脚本显式执行
- **并且** 任何一项失败都会导致门禁失败
