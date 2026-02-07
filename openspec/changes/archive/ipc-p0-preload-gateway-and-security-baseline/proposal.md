# 提案：ipc-p0-preload-gateway-and-security-baseline

## 背景

IPC 作为跨进程边界，必须先形成最小可防护面。仅有契约和校验还不足以应对未授权调用、超大 payload、事件风暴等风险。第三优先级应先固化 preload 网关与安全容量基线，防止核心链路在压力或攻击场景下失稳。

## 变更内容

- 将 **Preload Bridge 安全层**收敛为“白名单网关 + 最小暴露面 + 不可逃逸”。
- 将 **异常与边界覆盖矩阵**落为必测安全边界：未授权通道、超大 payload、事件订阅上限。
- 将 **Non-Functional Security/Capacity** 与错误码约束对齐，形成可测门槛。

## 受影响模块

- IPC — `openspec/specs/ipc/spec.md`（delta）
- Preload bridge — `apps/desktop/preload/src/`
- Main push/notifier — `apps/desktop/main/src/ipc/`
- Shared error code dictionary — `packages/shared/`

## 不做什么

- 不处理契约注册与生成流程（由 `ipc-p0-contract-ssot-and-codegen` 负责）
- 不处理运行时双向校验和 envelope（由 `ipc-p0-runtime-validation-and-error-envelope` 负责）

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-07）
