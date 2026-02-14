# 提案：s0-window-load-catch

## 背景

`apps/desktop/main/src/index.ts` 的主窗口加载分支当前使用 `void win.loadURL(...)` / `void win.loadFile(...)` 丢弃 Promise。  
当资源加载失败时，进程侧没有结构化日志，渲染层可能表现为黑屏，故障不可观测且难以快速定位。

## 变更内容

- 为 `win.loadURL(...)` 增加链式 `.catch(...)`，记录 `window_load_failed` 错误日志（含目标地址与错误信息）。
- 为 `win.loadFile(...)` 增加同等 `.catch(...)` 兜底，保证 dev/prod 两个 if/else 分支行为一致。
- 保持现有窗口创建流程不变，仅补齐失败路径可观测性。

## 协同关系（同文件独立 change）

- 本 change 与 `s0-app-ready-catch` 同时修改 `apps/desktop/main/src/index.ts`，建议同一 PR 串联提交以降低冲突成本。
- 两者保持独立变更边界：本 change 只覆盖窗口资源加载 Promise 兜底，不覆盖 `app.whenReady()` 初始化链尾兜底。

## 受影响模块

- Workbench（Main 启动链路）— `apps/desktop/main/src/index.ts`

## 依赖关系

- 上游依赖：无（Sprint0 并行组 A，独立项）。
- 横向协同：与 `s0-app-ready-catch` 同改 `apps/desktop/main/src/index.ts`，建议同 PR 串联提交以降低冲突成本。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s0-window-load-catch` 条目；
  - `openspec/specs/workbench/spec.md` 中启动与应用壳层稳定性相关要求。
- 核对项：
  - dev/prod 双分支资源加载失败均可观测；
  - 日志事件名与字段在两分支保持一致；
  - 变更边界仅限 `loadURL/loadFile` Promise 失败兜底。
- 结论：`NO_DRIFT`（与 Sprint0 定义一致，可进入后续 TDD 实施）。

## 踩坑提醒

- `loadFile` 分支同样需要 `.catch(...)`；不要只改 dev 分支，`if/else` 两条加载路径必须同时覆盖。

## 防治标签

- `SILENT` `FALLBACK`

## 不做什么

- 不调整窗口布局、尺寸、生命周期事件注册逻辑。
- 不引入新的重试策略或降级页面。
- 不改动 `app.whenReady()` 链尾异常处理（由 `s0-app-ready-catch` 负责）。

## 审阅状态

- 审阅状态：Owner 审阅：`PENDING`
