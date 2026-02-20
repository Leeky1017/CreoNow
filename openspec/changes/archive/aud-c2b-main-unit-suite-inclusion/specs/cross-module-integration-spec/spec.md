# Cross Module Integration Specification Delta

## Change: aud-c2b-main-unit-suite-inclusion

### Requirement: unit 执行计划必须覆盖 tests/unit + main/src 且具备 import-safe 导出能力（Wave1 / C2B）[ADDED]

发现式 runner 在 `--mode unit` 下必须同时覆盖：

- `apps/desktop/tests/unit/**`（desktop 单元/治理脚本）
- `apps/desktop/main/src/**/__tests__/**`（主进程源码内的单元/守卫）

并且构建的执行计划必须显式包含上述两类用例的执行命令，避免“发现了但没执行”或“漏测路径”。

#### Scenario: CMI-AUD-C2B-S1 unit discovery roots 必须包含 tests/unit 与 main/src [ADDED]

- **假设** runner 在 unit 模式下进行发现
- **当** 检查 runner 发现根目录配置
- **则** 必须包含 `apps/desktop/tests/unit` 与 `apps/desktop/main/src`

#### Scenario: CMI-AUD-C2B-S2 runner 必须导出 import-safe 执行计划并包含关键 sentinel [ADDED]

- **假设** 通过 import 的方式读取 runner 模块能力
- **当** 检查导出与入口 guard
- **则** 必须导出 `discoverUnitBuckets` 与 `buildUnitExecutionPlan`
- **并且** 入口必须通过 `isEntrypoint(import.meta.url)` guard，避免 import 时触发执行副作用

- **假设** 调用 `buildUnitExecutionPlan()`
- **当** 读取生成的 buckets 与 commands
- **则** buckets 必须至少包含：
  - `tsxFiles` 中同时覆盖 `tests/unit/**` 与 `main/src/**/__tests__/**`
  - `vitestFiles` 中包含 `apps/desktop/tests/unit/main/window-load-catch.test.ts`
- **并且** commands 中必须存在对上述 sentinel 文件的执行条目
