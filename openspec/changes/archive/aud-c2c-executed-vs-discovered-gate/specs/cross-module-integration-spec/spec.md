# Cross Module Integration Specification Delta

## Change: aud-c2c-executed-vs-discovered-gate

### Requirement: discovered 与 executed 测试集合必须精确一致（Wave2 / C2C）[ADDED]

系统必须提供可机器执行的一致性门禁，用于阻断“发现集合与执行集合不一致”的测试漂移风险，至少满足：

- 基于执行计划构建“发现集合”（discovered）与“执行集合”（executed）。
- 对 unit 与 integration 两个维度分别计算 `missing/extra`。
- 任一维度存在 mismatch 必须失败并输出明细。

#### Scenario: CMI-AUD-C2C-S1 discovered/executed mismatch 必须失败并输出明细 [ADDED]

- **假设** unit 或 integration 的“发现集合”与“执行集合”存在任意不一致（missing 或 extra）
- **当** 执行 `test:discovery:consistency` gate
- **则** gate 必须失败
- **并且** 输出 missing/extra 列表与 discovered/executed 计数，便于定位漂移来源
