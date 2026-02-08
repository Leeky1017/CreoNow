# IPC Specification Delta

## Change: ipc-p1-ipc-testability-harness

### Requirement: 可测试性 [MODIFIED]

IPC 层必须提供统一测试基建，使单元测试在无真实 Electron 运行时的条件下可重复执行。最小必备能力如下：

- `createMockIPCHandler(channel, response)`：构造主进程 handler 测试桩
- `createMockIPCEmitter(channel)`：构造 push emitter 测试桩
- `assertIPCCall(channel, expectedParams)`：断言 preload/renderer 转发行为
- `createMockIPCRenderer()`：统一 mock `ipcRenderer.invoke/send/on/removeListener`

测试必须满足：

- 不依赖真实时间、随机数、网络请求
- 不依赖真实 LLM 或真实 Electron 主/渲染进程
- 每个 Scenario 必须存在可追踪测试映射，映射缺失即视为失败

#### Scenario: 主进程 handler 单测不依赖 Electron runtime [ADDED]

- **假设** 测试 `file:document:create` handler
- **当** 使用 `createMockIPCHandler` 执行单元测试
- **则** 测试可在纯 Node 环境通过
- **并且** 不需要启动 Electron 进程

#### Scenario: Preload API 转发可精确断言 channel 与参数 [ADDED]

- **假设** 渲染层调用 `window.api.file.createDocument(payload)`
- **当** 使用 `createMockIPCRenderer` 执行 preload 测试
- **则** 可断言实际转发通道为 `file:document:create`
- **并且** payload 与返回 envelope 均符合契约

#### Scenario: Push 订阅/退订可测试且无泄漏 [ADDED]

- **假设** 渲染进程反复订阅并退订 `skill:stream:chunk`
- **当** 在 mock emitter 中执行 1,000 次订阅循环
- **则** 监听器数量在退订后回到初始值
- **并且** 不出现悬挂回调

#### Scenario: 场景映射缺失触发门禁失败 [ADDED]

- **假设** delta spec 新增 Scenario 但未补充对应测试映射
- **当** 执行 IPC 测试门禁
- **则** 门禁失败并输出缺失 Scenario ID 列表
- **并且** 阻断该 change 进入实现阶段
