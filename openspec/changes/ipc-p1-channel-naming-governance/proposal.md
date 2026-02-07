# 提案：ipc-p1-channel-naming-governance

## 背景

IPC 的三项 P0 基线已完成并归档，但通道命名仍存在治理缺口：主 spec 要求统一 `<domain>:<resource>:<action>`，而当前示例与历史通道仍混有两段命名（如 `project:create`、`skill:execute`）。若不先收敛命名治理，后续通道扩展将持续引入歧义、冲突和迁移成本。

## 变更内容

- 将 **通道命名规范**从“格式校验”升级为“域白名单 + 三段式强约束 + 冲突阻断”的可执行规则。
- 明确历史非三段式命名的收敛窗口与阻断时点，禁止无限期并存。
- 定义命名违规的稳定错误码与定位信息，便于 CI 和本地快速修复。

## 受影响模块

- IPC — `openspec/specs/ipc/spec.md`（delta）
- Contract registry/codegen — `packages/shared/types/ipc/`、`scripts/contract-generate.ts`
- Shared error code dictionary — `packages/shared/`

## 不做什么

- 不扩展新的通信模式或响应 envelope 语义。
- 不处理 IPC 性能压测与 SLO 门禁（由后续 acceptance change 处理）。

## 审阅状态

- Owner 审阅：`APPROVED`（2026-02-08）
