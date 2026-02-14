# 提案：s1-ipc-acl

## 背景

`runtime-validation.ts` 当前在 handler 执行前仅覆盖 schema/envelope 校验，未校验 IPC 调用来源（`event.senderFrame.url`）、调用载体（`webContents.id`）与会话角色，导致高权限通道存在来源绕过风险。preload 侧虽有 `allowedChannels` 白名单，但缺少来源级别 ACL，无法形成主进程侧强校验闭环。

## 变更内容

- 新增 `ipcAcl` 模块，定义按通道分级的调用方 ACL（来源、sandbox 要求、角色约束）。
- 将调用方校验集成到 `runtime-validation` 的业务执行前链路，未通过时统一返回 `FORBIDDEN`。
- 补齐 ACL 单元测试，覆盖未知来源拒绝、应用来源放行与非法调用拒绝路径。
- 对齐 preload 侧网关约束，保证 dev/prod 来源策略与主进程 ACL 一致。

## 受影响模块

- `ipc` — 增加调用方来源与身份 ACL 鉴权层。
- `preload` — origin 兼容策略与通道网关约束同步。

## 依赖关系

- 上游依赖：`s0-sandbox-enable`（渲染进程 sandbox 基线）。
- 横向依赖：`openspec/specs/ipc/spec.md` 中 Preload Bridge 安全层与运行时校验要求。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 的 `s1-ipc-acl` 条目（A4-H-002）。
  - `openspec/specs/ipc/spec.md`（Preload Bridge 安全层、运行时数据校验、统一错误处理）。
  - `openspec/changes/archive/s0-sandbox-enable/specs/ipc-delta.md`（sandbox 安全前提）。
- 核对项：
  - handler 执行前需新增调用方 ACL 校验，且拒绝路径返回 `FORBIDDEN`。
  - origin 白名单同时覆盖 development（`http://localhost:*` / `VITE_DEV_SERVER_URL`）与 production（`file://`）来源。
  - 高权限通道拒绝未授权来源/身份调用，低权限通道按 ACL 策略放行。
- 结论：`NO_DRIFT`（与 roadmap 和 IPC 主 spec 一致，可进入后续 TDD 实施）。

## 踩坑提醒（防复发）

- development 与 production 的 `senderFrame.url` 格式不同，必须同时支持 `http://localhost:*` 与 `file://`，避免误封正常调用或放过非法来源。
- 只在 preload 白名单做限制不够，必须以主进程 `runtime-validation` 中的 ACL 结果作为最终准入判定。

## 防治标签

- `SECURITY` `FAKETEST` `DRIFT`

## 不做什么

- 不在本 change 中新增/重命名 IPC 通道，也不修改现有业务 handler 的业务语义。
- 不在本 change 中引入完整会话权限系统重构（仅落地调用方 ACL 最小闭环）。
- 不在本 change 中扩展非 IPC 安全议题（如 CSP、依赖治理）。

## 审阅状态

- Owner 审阅：`PENDING`
