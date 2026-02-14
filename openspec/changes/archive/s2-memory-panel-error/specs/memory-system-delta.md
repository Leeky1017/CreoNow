# Memory System Specification Delta

## Change: s2-memory-panel-error

### Requirement: MemoryPanel 加载异常必须进入可见错误态闭环 [ADDED]

MemoryPanel 在加载数据过程中遇到异常时，必须显式进入 `error` 状态并在 UI 呈现可见错误结果，禁止静默失败。

#### Scenario: MEM-S2-MPE-S1 loadPanelData 异常触发错误状态 [ADDED]

- **假设** `loadPanelData` 调用链路抛出异常（例如 `invoke` 失败）
- **当** MemoryPanel 捕获该异常
- **则** 必须执行错误状态写入（例如 `setStatus("error")`）
- **并且** 不得吞错后继续保持成功或加载中状态

#### Scenario: MEM-S2-MPE-S2 错误状态在 UI 中可见且可验证 [ADDED]

- **假设** MemoryPanel 已进入 `error` 状态
- **当** 用户查看面板
- **则** UI 必须展示与错误状态一致的可见反馈
- **并且** 测试可稳定断言该错误态展示

## Out of Scope

- 修改 MemoryPanel 的业务数据模型。
- 引入新的 Memory 功能流程。
- 处理与 MemoryPanel 无关的 store 竞态问题。
