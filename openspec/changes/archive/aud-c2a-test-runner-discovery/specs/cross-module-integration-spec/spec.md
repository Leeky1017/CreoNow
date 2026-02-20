# Cross Module Integration Specification Delta

## Change: aud-c2a-test-runner-discovery

### Requirement: 将 unit/integration 测试从白名单迁移到发现式执行 [ADDED]

系统必须将 unit/integration 的测试入口统一为发现式执行，以避免“套件漏执行/入口漂移”。至少满足：

- `test:unit` 与 `test:integration` 必须通过同一个 discovery runner 入口执行。
- discovery runner 必须包含 integration + perf 的 discovery roots（suite 可被发现）。

#### Scenario: CMI-AUD-C2A-S1 unit/integration 脚本必须使用 discovery runner 入口 [ADDED]

- **假设** 查看仓库 `package.json` scripts
- **当** 读取 `test:unit` 与 `test:integration`
- **则** 两者必须使用 `scripts/run-discovered-tests.ts` 作为入口（mode 参数区分）

#### Scenario: CMI-AUD-C2A-S2 discovery runner 必须包含 integration + perf roots [ADDED]

- **假设** 读取 `scripts/run-discovered-tests.ts` 源码
- **当** 检查 discovery roots 定义
- **则** 必须包含 `apps/desktop/tests/integration` 与 `apps/desktop/tests/perf`
