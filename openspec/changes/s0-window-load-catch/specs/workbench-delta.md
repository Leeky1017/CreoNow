# Workbench Specification Delta

## Change: s0-window-load-catch

### Requirement: 主窗口资源加载失败必须可观测 [MODIFIED]

主进程在创建主窗口后，资源加载 Promise 必须具备显式失败兜底：

- `win.loadURL(...)` 分支必须链式 `.catch(...)`，并记录 `window_load_failed` 日志 [ADDED 实现]
- `win.loadFile(...)` 分支必须链式 `.catch(...)`，并记录同名日志 [ADDED 实现]
- 日志至少包含目标（URL 或文件路径）与错误信息，便于排查黑屏根因 [ADDED]

#### Scenario: dev 分支 loadURL 失败被记录 [ADDED]

- **假设** 应用运行在 dev 模式，`loadURL` Promise 被拒绝（例如本地 dev server 不可达）
- **当** 主窗口执行资源加载
- **则** 系统记录一次 `window_load_failed` 错误日志
- **并且** 日志包含失败 URL 与错误文本

#### Scenario: prod 分支 loadFile 失败被记录 [ADDED]

- **假设** 应用运行在 prod 模式，`loadFile` Promise 被拒绝（例如入口文件缺失）
- **当** 主窗口执行资源加载
- **则** 系统记录一次 `window_load_failed` 错误日志
- **并且** 日志包含失败文件路径与错误文本

#### Scenario: 资源加载成功不产生误报 [ADDED]

- **假设** `loadURL/loadFile` Promise 正常 resolve
- **当** 主窗口完成资源加载
- **则** 不产生 `window_load_failed` 错误日志

## 协同说明（同文件独立 change）

- 本 change 与 `s0-app-ready-catch` 同改 `apps/desktop/main/src/index.ts`，建议同 PR 提交以减少冲突。
- 责任边界：`s0-window-load-catch` 只约束窗口资源加载 Promise；`s0-app-ready-catch` 只约束 `app.whenReady()` 初始化链尾异常兜底。

## Out of Scope

- `app.whenReady()` 链尾 `.catch` 与 `app.quit()` 退出策略
- 启动流程重试机制与恢复页面
