# 提案：ipc-p0-runtime-validation-and-error-envelope

## 背景

契约与代码生成解决的是“定义一致性”，但 IPC 在运行时仍可能出现非法输入、非法输出、超时和异常泄漏。作为核心 spec 的第二优先级，需要先收敛“统一校验 + 统一错误封装”，确保任何失败都可判定、可追踪、可恢复。

## 变更内容

- 将 **运行时数据校验**扩展为“请求校验 + 响应校验”双向校验。
- 将 **统一错误处理**收敛为“稳定错误码 + 不泄露内部异常 + 超时可清理”的强约束。
- 对 Request-Response 明确强制 envelope：`{ success: true, data } | { success: false, error }`。

## 受影响模块

- IPC — `openspec/specs/ipc/spec.md`（delta）
- Main IPC handler middleware — `apps/desktop/main/src/ipc/`
- Shared IPC error types — `packages/shared/`

## 不做什么

- 不涉及契约注册表与 codegen 产物策略（由 `ipc-p0-contract-ssot-and-codegen` 负责）
- 不涉及 preload 白名单网关与容量背压（由 `ipc-p0-preload-gateway-and-security-baseline` 负责）

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-07）
