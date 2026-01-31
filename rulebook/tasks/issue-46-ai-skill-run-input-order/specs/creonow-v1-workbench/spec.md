# Spec Delta: creonow-v1-workbench (ISSUE-46)

本任务修复 skill prompt 注入顺序导致的 E2E 非确定性问题：Fake AI server 使用“最后一条 user message”生成 `E2E_RESULT:*`，因此 `ai:skill:run` 必须确保 raw input 作为最后一条 user message 发送。

## Changes

- Update: `ai:skill:run` 注入 prompt 时，将 `prompt.user` 与 raw input 分离为两条 user message，并确保 raw input 永远在最后（Fake-first 可测）。
- Add: unit regression test 覆盖 message ordering，避免 `ai-apply` E2E 再次被 prompt 内容污染。

## Acceptance

- `pnpm desktop:test:e2e` 通过（包含 `ai-apply.spec.ts`）。
- raw input 必须是 provider 请求中的最后一条 user message（OpenAI/Anthropic）。
