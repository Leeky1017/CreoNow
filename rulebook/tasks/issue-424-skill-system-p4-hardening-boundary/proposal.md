# Proposal: issue-424-skill-system-p4-hardening-boundary

## Why

`openspec/changes/skill-system-p4-hardening-boundary` 已定义 Skill System 的 P4 边界硬化验收标准，但当前实现仍缺少容量上限（global 1000 / project 500）、跨项目自定义技能越权阻断与审计、单输出超长收口，以及 `SKILL_CAPACITY_EXCEEDED`/`SKILL_SCOPE_VIOLATION` 错误码链路。若不补齐，技能系统在高压与异常路径下无法满足 P4 可验收标准。

## What Changes

- 按 TDD 交付 P4 场景对应测试（异常矩阵 + NFR + 安全边界），完整记录 Red→Green 证据。
- 在 Skill Service 增加自定义技能容量上限校验：
  - 全局自定义技能总量上限 `1000`
  - 单项目自定义技能总量上限 `500`
  - 超限返回 `SKILL_CAPACITY_EXCEEDED`
- 在 Skill Service 增加跨项目技能越权识别：
  - 当技能 ID 存在但不属于当前项目上下文时返回 `SKILL_SCOPE_VIOLATION`
  - 同步写入安全审计日志
- 在 AI IPC / Service 增加单输出超长收口（避免超长文本造成 IPC 负载失控）。
- 扩展 IPC 契约错误码集合并更新 codegen：新增 `SKILL_CAPACITY_EXCEEDED`、`SKILL_SCOPE_VIOLATION`。
- 完成 OpenSpec change 勾选、归档与 `EXECUTION_ORDER.md` 同步。

## Impact

- Affected specs:
  - `openspec/changes/skill-system-p4-hardening-boundary/proposal.md`
  - `openspec/changes/skill-system-p4-hardening-boundary/specs/skill-system-delta.md`
  - `openspec/changes/skill-system-p4-hardening-boundary/tasks.md`
- Affected code:
  - `apps/desktop/main/src/services/skills/skillService.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `openspec/guards/cross-module-contract-baseline.json`
- Affected tests:
  - `apps/desktop/tests/unit/skill-scope-management.test.ts`
  - `apps/desktop/tests/integration/skill-session-queue-limit.test.ts`
  - `apps/desktop/tests/unit/cross-module-drift-zero.spec.ts`
  - `apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`
- Breaking change: NO（维持既有通道行为，新增仅为边界错误码与硬保护）
- User benefit: 技能系统在容量、安全、并发边界条件下具备可判定错误与可审计行为，避免 silent failure。
