# IPC Specification Delta

## Change: s0-sandbox-enable

### Requirement: 渲染进程必须在 Sandbox 下运行 [MODIFIED]

主窗口创建时必须启用 Electron sandbox，禁止以 `sandbox: false` 运行渲染进程。

#### Scenario: SSE-S1 BrowserWindow 启用 sandbox [ADDED]

- **假设** 应用创建主窗口
- **当** 构造 `BrowserWindow` 的 `webPreferences`
- **则** `sandbox` 为 `true`
- **并且** 不允许在同路径下回退为 `false`

### Requirement: Preload/contextBridge 边界必须在 sandbox 下可验证 [MODIFIED]

在 sandbox 模式下，preload 必须继续作为唯一桥接层，并满足以下边界验证点：

- 仅通过 `contextBridge.exposeInMainWorld` 暴露受控 API（如 `window.api`）
- 不暴露 `ipcRenderer` 引用
- 不暴露 `require`、`process` 或 Node 内建模块能力

#### Scenario: SSE-S2 渲染进程仅能通过 contextBridge 调用 IPC [ADDED]

- **假设** 应用以 sandbox 模式启动
- **当** 渲染进程尝试访问 `window.api`
- **则** 受控 API 可用并可完成既有 IPC 调用
- **并且** 访问 `window.require` 与 `window.ipcRenderer` 失败或为 `undefined`

### Requirement: Sandbox 启用后必须通过 E2E 回归 [ADDED]

启用 sandbox 后，应用必须通过 E2E 回归验证启动链路与核心交互不回归，并包含至少一个 sandbox 边界断言点。

#### Scenario: SSE-S3 启动与主交互链路 E2E 通过 [ADDED]

- **假设** 已将主窗口 `sandbox` 设为 `true`
- **当** 执行 `pnpm test:e2e` 回归
- **则** 应用可正常启动并完成主交互链路
- **并且** E2E 结果包含 sandbox 边界验证结论（渲染进程受沙箱约束）
