# Workbench Specification Delta

## Change: s0-app-ready-catch

### Requirement: 应用初始化主链路必须有链尾兜底 [MODIFIED]

主进程启动时，`app.whenReady()` 初始化链路必须显式处理致命异常：

- `app.whenReady().then(...)` 链尾必须追加 `.catch((err) => ...)` [ADDED 实现]
- 链尾 `catch` 必须记录 `app_init_fatal` 错误日志，包含可定位的错误文本与堆栈（可用时）[ADDED]
- 捕获到致命异常后必须调用 `app.quit()` 做进程收口 [ADDED]
- 不再使用无链尾兜底的 `void ...` fire-and-forget 形式 [MODIFIED]

#### Scenario: 初始化链路异常触发致命日志与退出 [ADDED]

- **假设** `app.whenReady().then(...)` 链路任一步骤抛错或 Promise reject
- **当** 启动链路执行到链尾 `.catch`
- **则** 系统记录一次 `app_init_fatal` 错误日志
- **并且** 日志包含错误文本，若异常为 `Error` 则包含 `stack`
- **并且** 调用 `app.quit()` 终止应用

#### Scenario: 初始化链路成功不误触退出 [ADDED]

- **假设** `app.whenReady()` 及后续初始化步骤全部成功
- **当** 启动链路执行完成
- **则** 不记录 `app_init_fatal` 错误日志
- **并且** 不调用 `app.quit()`

#### Scenario: 启动链路无未处理拒绝泄漏 [ADDED]

- **假设** 初始化流程发生 Promise reject
- **当** 启动链路完成异常收敛
- **则** 异常由链尾 `.catch` 处理，不形成未处理拒绝泄漏

## 协同说明（同文件独立 change）

- 本 change 与 `s0-window-load-catch` 同改 `apps/desktop/main/src/index.ts`，建议同 PR 协同交付。
- 责任边界：`s0-app-ready-catch` 仅约束 `app.whenReady()` 链尾兜底；`s0-window-load-catch` 仅约束窗口资源加载 Promise 兜底。

## Out of Scope

- `win.loadURL/loadFile` 失败日志策略
- 启动异常后的重试/恢复页机制
