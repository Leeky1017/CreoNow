# Cross Module Integration Specification Delta

## Change: aud-m5-coverage-gate-artifacts

### Requirement: CI 必须包含 coverage gate 与产物上传，并纳入 `ci` required check（Wave2 / M5）[ADDED]

系统必须在 CI 中提供可追溯的覆盖率门禁与产物，以满足审计与治理闭环：

- coverage gate 必须为独立 job（便于定位失败原因与产物收集）。
- 必须上传覆盖率产物（例如 `coverage/` 报告），用于后续审计与定位。
- `ci` 汇总门禁必须显式依赖 coverage gate，防止绕过。

#### Scenario: CMI-AUD-M5-S1 CI workflow 包含 coverage gate 与产物上传 step [ADDED]

- **假设** 打开 `.github/workflows/ci.yml`
- **当** 检查 workflow jobs 与 steps
- **则** 必须存在名为 `coverage-gate` 的 job
- **并且** 该 job 内必须包含 “Upload coverage artifacts” step（覆盖率产物可回溯）

#### Scenario: CMI-AUD-M5-S2 `ci` 汇总门禁必须依赖 coverage gate [ADDED]

- **假设** workflow 使用 `ci` job 作为 required check 聚合
- **当** 检查 `ci` job 的 `needs` 依赖列表
- **则** 必须包含 `coverage-gate`
