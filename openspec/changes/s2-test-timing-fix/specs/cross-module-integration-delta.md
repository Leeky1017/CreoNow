# Cross-Module Integration Specification Delta

## Change: s2-test-timing-fix

### Requirement: 跨模块测试异步等待必须采用条件驱动而非固定 sleep [ADDED]

跨模块测试中的异步流程必须通过可验证条件达成来判定通过，不得使用 `setTimeout(resolve, ...)` 作为主要等待机制，以降低时序抖动和虚假通过风险。

#### Scenario: CMI-S2-TTF-S1 固定 sleep 等待被条件等待替换 [ADDED]

- **假设** 现有测试通过 `setTimeout(resolve, N)` 等待异步流程
- **当** 测试改造为 `waitFor`、条件轮询或事件等待
- **则** 测试通过必须由“条件达成”驱动
- **并且** 不得保留“仅到达固定时长即通过”的判断路径

#### Scenario: CMI-S2-TTF-S2 异步测试稳定性由行为条件保证 [ADDED]

- **假设** 同一异步测试在不同运行负载下执行
- **当** 等待机制基于可观测行为条件
- **则** 测试结果应由行为达成与否决定
- **并且** 不依赖固定睡眠时长掩盖潜在失败

## Out of Scope

- 修改生产代码中的业务异步逻辑。
- 调整与本 change 无关的功能测试范围。
- 引入新的测试框架或替换现有测试运行器。
