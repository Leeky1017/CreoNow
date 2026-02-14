# 提案：s0-sandbox-enable

## 背景

当前窗口创建配置中 `webPreferences.sandbox` 为 `false`，渲染层在遭遇 XSS 或依赖链污染时，主进程边界保护不足。Sprint0 需要将 sandbox 打开，并验证 preload/contextBridge 在受限环境下仍满足既有 IPC 能力且不泄露 Node 能力。

## 变更内容

- 将主窗口 `webPreferences.sandbox` 显式改为 `true`。
- 对 preload 边界进行验证：仅允许 `contextBridge.exposeInMainWorld` 暴露契约 API，不暴露 `ipcRenderer`/`require`/Node 内建能力。
- 增加 sandbox 回归验证与 E2E 回归，覆盖启动路径和渲染进程边界行为。

## 受影响模块

- `ipc` — Preload 桥接安全边界与渲染进程访问模型。
- `workbench`（回归影响面）— 应用启动后基础交互链路可用性。

## 依赖关系

- 上游依赖：无（Sprint0 并行组 A，独立项）。
- 横向关注：与 preload 相关实现必须维持 `window.api` 可用，同时保持 Node 能力隔离。

## Dependency Sync Check

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s0-sandbox-enable` 条目；
  - `openspec/specs/ipc/spec.md` 中 Preload Bridge 安全层与 Node 隔离要求。
- 核对项：
  - `webPreferences.sandbox` 必须显式为 `true`；
  - sandbox 启用后仍仅通过 `contextBridge` 暴露受控 API；
  - 渲染层不可直接访问 `ipcRenderer`、`require`、Node 内建能力。
- 结论：`NO_DRIFT`（与 IPC 主 spec 安全约束一致，可进入后续 TDD 实施）。

## 不做什么

- 不引入新的 IPC 通道或修改业务层 handler 语义。
- 不在本 change 内扩展 ACL、鉴权与细粒度来源校验规则（由后续安全 change 处理）。

## 审阅状态

- Owner 审阅：`PENDING`
