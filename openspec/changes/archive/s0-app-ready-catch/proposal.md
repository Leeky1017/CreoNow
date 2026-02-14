# 提案：s0-app-ready-catch

## 背景

`apps/desktop/main/src/index.ts` 当前使用 `void app.whenReady().then(...)` 启动链路。  
链路任一点异常会变成 unhandled rejection，缺少统一日志与进程级收敛动作，可能造成启动失败且难以诊断。

## 变更内容

- 为 `app.whenReady().then(...)` 链尾补充 `.catch((err) => ...)`，记录 `app_init_fatal` 结构化错误日志。
- 在链尾 `catch` 中调用 `app.quit()`，确保主进程在致命初始化异常时快速收口。
- 移除 `void` fire-and-forget 写法，改为显式链式兜底，避免未处理 Promise 拒绝。

## 协同关系（同文件独立 change）

- 本 change 与 `s0-window-load-catch` 同改 `apps/desktop/main/src/index.ts`，建议同一 PR 合并，统一处理启动链路异常治理。
- 两者保持独立边界：本 change 仅覆盖 `app.whenReady()` 初始化链尾，窗口 `loadURL/loadFile` 失败兜底由 `s0-window-load-catch` 定义。

## 受影响模块

- Workbench（Main 启动生命周期）— `apps/desktop/main/src/index.ts`

## 依赖关系

- 上游依赖：无（Sprint0 并行组 A，独立项）。
- 横向协同：与 `s0-window-load-catch` 同改 `apps/desktop/main/src/index.ts`，建议同 PR 协同提交以减少冲突。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s0-app-ready-catch` 条目；
  - `openspec/specs/workbench/spec.md` 中应用壳层启动稳定性相关要求。
- 核对项：
  - `app.whenReady().then(...)` 初始化链路异常必须被链尾收敛；
  - 致命异常日志必须结构化记录并可定位；
  - 变更边界仅限 `app.whenReady()` 链尾兜底，不扩展到资源加载分支。
- 结论：`NO_DRIFT`（与 Sprint0 定义一致，可进入后续 TDD 实施）。

## 踩坑提醒

- 在 `catch` 中调用 `app.quit()` 时，需确认 app 未完全 ready 的场景不会触发额外副作用；校验 `app.on("window-all-closed")` 与退出路径不冲突。

## 防治标签

- `SILENT` `FALLBACK`

## 不做什么

- 不改变 `BrowserWindow` 创建参数与页面加载分支逻辑。
- 不新增重试/延迟退出机制。
- 不扩展到其他异步链路（仅限 `app.whenReady()` 初始化主链）。

## 审阅状态

- 审阅状态：Owner 审阅：`PENDING`
