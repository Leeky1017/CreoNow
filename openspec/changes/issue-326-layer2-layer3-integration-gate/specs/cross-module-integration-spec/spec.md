# Cross Module Integration Specification Delta

## Change: issue-326-layer2-layer3-integration-gate

### Requirement: Layer2+Layer3 里程碑集成门禁 [ADDED]

每完成一个 Layer 的里程碑，必须执行一次跨模块集成检查，并将结果落盘。该检查至少包含：

- 全量门禁测试执行结果（命令与通过/失败状态）；
- `cross-module-integration-spec` 与 IPC 契约 SSOT 的通道/模式/响应结构核对；
- implemented / partial / missing 的 delta report 与后续动作。

#### Scenario: 全量门禁结果被记录 [ADDED] (L23-G1)

- **假设** Layer2 与 Layer3 功能都已实现
- **当** 执行里程碑集成检查
- **则** 必须执行并记录全量门禁命令结果
- **并且** 结果落盘到 `openspec/_ops/task_runs/ISSUE-<N>.md`

#### Scenario: 跨模块契约漂移被显式标注 [ADDED] (L23-G2)

- **假设** 跨模块 spec 与运行时契约存在差异
- **当** 完成契约核对
- **则** 差异必须被分类为 `Implemented` / `Partial` / `Missing`
- **并且** 每条差异都必须附带代码或测试证据路径

#### Scenario: 未收敛项必须有后续动作 [ADDED] (L23-G3)

- **假设** 存在 `Partial` 或 `Missing` 项
- **当** 输出 delta report
- **则** 每一项必须给出后续动作（Issue/Owner/状态）
- **并且** 禁止将该项标记为完成

### Requirement: Layer2+Layer3 当前跨模块对齐基线（2026-02-09） [ADDED]

本次里程碑检查后的对齐基线如下：

- 已实现（Implemented）：
  - `memory:episode:record`、`memory:trace:get`、`memory:trace:feedback`
  - `knowledge:query:relevant`、`knowledge:query:subgraph`、`knowledge:query:byids`
  - `project:project:switch`
  - 契约冲突阻断（`IPC_CONTRACT_DUPLICATED_CHANNEL`）
- 部分实现（Partial）：
  - AI/Skill 通道命名与主 spec 示例不一致（实现为 `ai:skill:*`）
  - 响应 envelope 为 `{ ok: ... }`，与主 spec `{ success: ... }` 不一致
  - 错误码示例表与当前错误字典未完全对齐
- 未实现（Missing）：
  - `ai:chat:send`
  - `export:project`

#### Scenario: 当前对齐基线被锁定 [ADDED] (L23-B1)

- **假设** 已完成契约与测试证据核对
- **当** 生成本次 delta
- **则** 对齐状态必须以“已实现/部分实现/未实现”写入基线
- **并且** 后续变更必须以该基线为起点追踪收敛

#### Scenario: 部分实现项保持阻断标记 [ADDED] (L23-B2)

- **假设** 条目被标记为 `Partial` 或 `Missing`
- **当** 进入下一里程碑规划
- **则** 必须先明确“对齐规范”或“改实现”的收敛方向
- **并且** 收敛前不得宣称跨模块契约已全量完成
