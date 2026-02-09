# Proposal: issue-352-ai-service-p0-llmproxy-config-security

## Why

`ai-service-p0-llmproxy-config-security` 已有 delta spec，但实现仍停留在旧 `ai:proxy*` 契约与明文配置路径，且缺失 P0 明确要求的安全存储、可判定错误码与重试/限流基线，无法作为后续 AI Service 阶段的稳定上游。

## What Changes

- 将 AI 配置 IPC 收敛到 `ai:config:get|update|test`。
- 在主进程配置服务中引入 `safeStorage` 加密/解密 API Key 的持久化路径，禁止明文落盘。
- 在 AI 调用链路增加默认 `60 req/min` 限流与 `1s/2s/4s` 网络重试（最多 3 次）。
- 补齐 S1/S2/S3 单测并接入 `pnpm test:unit`。
- 更新 IPC 契约生成产物与相关调用方、映射测试。

## Impact

- Affected specs:
  - `openspec/changes/ai-service-p0-llmproxy-config-security/**`
  - `openspec/changes/EXECUTION_ORDER.md`（归档阶段）
- Affected code:
  - `apps/desktop/main/src/services/ai/*`
  - `apps/desktop/main/src/ipc/*`
  - `apps/desktop/renderer/src/features/settings/ProxySection.tsx`
  - `packages/shared/types/ipc-generated.ts`
- Breaking change: NO（同一链路迁移，调用方同步改名）
- User benefit: 配置链路安全可审计、错误码可判定、网络抖动下成功率更高、速率超限行为可预期
