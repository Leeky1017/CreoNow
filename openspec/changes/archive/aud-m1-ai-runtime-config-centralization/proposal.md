# 提案：aud-m1-ai-runtime-config-centralization

## Why（问题与目标）

AI runtime 的限流/容量等关键参数若硬编码在代码中，会导致：

- 配置漂移：环境差异无法通过治理配置统一收敛。
- 审计不可追溯：无法证明“限流/容量来自受控配置源”。

本 change 的目标是把 AI runtime quotas 统一从 `runtimeGovernance` 配置解析，移除硬编码常量，并用最小静态测试锁定引用点。

## What（交付内容）

- AI IPC 层从 `resolveRuntimeGovernanceFromEnv` 解析运行时治理配置。
- 关键 quotas 必须读取 `runtimeGovernance.ai.*`（例如 stream rate limit、chat message capacity）。
- 移除硬编码常量（例如 `AI_STREAM_RATE_LIMIT_PER_SECOND`、`AI_CHAT_MESSAGE_CAPACITY`）。
- 新增回归测试：`apps/desktop/tests/unit/ai-runtime-governance-centralization.test.ts`
  - 覆盖 Scenario `AIS-AUD-M1-S1`（对应注释 S1）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-m1-ai-runtime-config-centralization/specs/ai-service/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/ai-runtime-governance-centralization.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内调整 quotas 的具体数值（由治理配置与环境决定）。
- 不扩展新的 AI runtime 治理字段（仅收敛已有字段的读取路径）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
