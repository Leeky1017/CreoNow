# Spec Delta: creonow-v1-workbench (ISSUE-17)

本任务实现 `P0-002`（IPC contract SSOT + codegen + typed invoke gate），用于把 `CNWB-REQ-040` 的 IPC Envelope 与错误码字典落到可生成、可测试、可阻断漂移的契约系统。

## Changes

- Add: IPC contract SSOT（channels + request/response schema + error codes）。
- Add: codegen 脚本 `contract:generate`，生成 `packages/shared/types/ipc-generated.ts` 并提交入库（禁止手改）。
- Add: CI gate `contract:check`（生成后 `git diff --exit-code` 必须为 0）。
- Add: preload typed invoke gate：只暴露 `window.creonow.invoke(channel,payload)`；unknown channel 返回 `INVALID_ARGUMENT`（Envelope）。

## Acceptance

- 所有 IPC invoke 必须返回 `{ ok: true|false }`，错误码稳定可测。
- `pnpm contract:check` 必须在 CI 运行并作为门禁阻断漂移。
- Windows E2E 能断言 `app:ping` 通过 `window.creonow.invoke` 的成功路径。
