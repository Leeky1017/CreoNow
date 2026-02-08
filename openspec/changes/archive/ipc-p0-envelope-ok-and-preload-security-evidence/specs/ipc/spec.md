# IPC Specification Delta

## Change: ipc-p0-envelope-ok-and-preload-security-evidence

### Requirement: 三种通信模式 [MODIFIED]

对于 Request-Response 模式，主进程返回 envelope 规范字段统一为：

- 成功：`{ ok: true, data: T }`
- 失败：`{ ok: false, error: IPCError }`

该变更仅修正文档表达与实现一致性，不改变生产接口行为。

#### Scenario: envelope 文档示例统一为 ok [MODIFIED]

- **假设** IPC 文档中存在 Request-Response envelope 示例
- **当** 开发者检查主 spec 与本次指定回写的 archived specs
- **则** 所有示例均使用 `ok: true|false`
- **并且** 不出现 `success: true|false` 的旧字段示例

### Requirement: Preload Bridge 安全层 [MODIFIED]

“渲染进程无法获得 `ipcRenderer` 引用”必须有自动化证据，至少包括：

- unit 证据：preload 暴露面仅包含白名单键（`creonow`、`__CN_E2E_ENABLED__`）
- E2E 证据：真实 Electron 运行时中 `window.ipcRenderer` 与 `window.require` 不可用，同时 `window.creonow.invoke` 可用

#### Scenario: 渲染进程无法获得 ipcRenderer 引用具备自动化证据 [MODIFIED]

- **假设** 渲染进程在真实 Electron 上下文中尝试访问 `window.ipcRenderer` 与 `window.require`
- **当** 执行 preload 安全单测与 app-launch E2E 安全断言
- **则** 访问结果为 `undefined` 或受隔离策略拒绝
- **并且** `window.creonow.invoke` 仍可调用 `app:system:ping` 并返回合法 envelope

