# 提案：s2-memory-panel-error

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 2（A6-M-001）指出：`MemoryPanel` 在加载链路异常时缺少完整错误态闭环，导致错误可被吞没或状态表现不一致，属于“失败未被明确呈现”的静默失败风险。

## 变更内容

- 为 `loadPanelData` 增加异常捕获与显式错误状态写入（`setStatus("error")`）。
- 建立 MemoryPanel UI 错误态展示闭环，确保异常在界面可见。
- 增加测试覆盖：当 `invoke` 异常时，面板进入错误态。

## 受影响模块

- Memory System UI（`apps/desktop/renderer/src/features/memory/MemoryPanel.tsx`）— 异常处理与状态流转补齐。
- 相关前端测试层 — 新增错误态回归断言。

## 依赖关系

- 上游依赖：无强依赖（Sprint 2 债务组独立项）。
- 执行分组：位于推荐执行顺序 W6（与 `s2-store-race-fix` 同批）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 债务组 `s2-memory-panel-error` 条目；
  - Sprint 2 依赖关系中“债务组内部全部独立”约束。
- 核对项：
  - 变更范围限定为 MemoryPanel 错误处理与 UI 错误态闭环；
  - 异常场景必须有可验证的 error 状态；
  - 成功链路语义不被本次改动改变。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- 不能在 `catch` 中仅记录日志而不更新 UI 状态。
- 错误态应可被稳定触发和验证，避免仅依赖控制台输出。
- 保持状态机单一来源，避免同时维护多个冲突错误标记。

## 防治标签

- `SILENT` `FALLBACK` `FAKETEST`

## 不做什么

- 不改动 MemoryPanel 的业务数据结构。
- 不扩展新的 Memory 功能入口。
- 不在本 change 内处理 store 竞态问题（该项由 `s2-store-race-fix` 负责）。

## 审阅状态

- Owner 审阅：`PENDING`
