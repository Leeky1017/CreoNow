# 提案：ipc-p0-contract-ssot-and-codegen

## 背景

`openspec/specs/ipc/spec.md` 已覆盖完整 IPC 目标态，但当前范围较大。要把 IPC 作为 CN 核心 spec 落地，第一优先级必须先建立可执行的契约基线，否则后续校验、安全和性能约束都无法稳定实施。

## 变更内容

- 将 **Schema-First 契约定义**收敛为“单一契约注册表（SSOT）+ 禁止绕过契约直连 IPC”的可验收基线。
- 将 **契约自动生成与校验**收敛为“可重复生成（deterministic）+ CI 漂移阻断 + 稳定错误码”。
- 明确本 change 的输出为：可审阅的 Delta Spec（不直接修改主 spec）。

## 受影响模块

- IPC — `openspec/specs/ipc/spec.md`（delta）
- Shared contract — `packages/shared/types/ipc/`
- Codegen script — `scripts/contract-generate.ts`
- Generated artifacts — `packages/shared/types/ipc/generated/`、`preload/src/generated/`、`main/src/ipc/generated/`

## 不做什么

- 不包含运行时请求/响应校验细则（留给 `ipc-p0-runtime-validation-and-error-envelope`）
- 不包含 preload 安全网关与容量限制（留给 `ipc-p0-preload-gateway-and-security-baseline`）

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-07）
