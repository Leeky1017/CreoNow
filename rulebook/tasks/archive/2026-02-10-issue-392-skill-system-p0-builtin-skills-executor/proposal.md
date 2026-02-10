# Proposal: issue-392-skill-system-p0-builtin-skills-executor

## Why

`openspec/changes/skill-system-p0-builtin-skills-executor` 目前仅有规格草案，代码层仍停留在单一 `builtin:polish` + 直接 `ai:skill:run` 调用，缺少 8 个内置技能定义、执行前输入校验、上下文组装注入和结构化失败语义。若不完成该 P0 基线，`skill-system-p1~p4` 的触发、作用域、自定义技能与调度能力将缺乏可复用执行内核。

同时，依赖同步检查发现该 change 文档中的 IPC 命名与现有治理存在漂移：仓库 IPC 已执行三段式命名治理，执行通道应为 `ai:skill:run`、取消通道应为 `ai:skill:cancel`（非两段式 `skill:execute` / `skill:cancel`）。本任务将先修正文档漂移，再进入 Red/Green。

## What Changes

- 交付 8 个 builtin skills（`polish`、`rewrite`、`continue`、`expand`、`condense`、`style-transfer`、`translate`、`summarize`）的可加载定义。
- 新增 `SkillExecutor` 执行层，统一处理：
  - 输入校验（空输入、续写上下文前置条件）
  - Context Engine 组装注入
  - LLM 调用与结构化 `SkillResult`
- 对齐 IPC 执行链路：
  - 触发：`ai:skill:run`
  - 推送：`skill:stream:chunk` / `skill:stream:done`
  - 取消：`ai:skill:cancel`
- 渲染层 store 对齐执行状态（executionId / streaming / cancel / error / retry）。
- 全程按 TDD 落盘 Red/Green 证据，并完成 change + Rulebook + RUN_LOG 收口归档。

## Impact

- Affected specs:
  - `openspec/changes/skill-system-p0-builtin-skills-executor/proposal.md`
  - `openspec/changes/skill-system-p0-builtin-skills-executor/tasks.md`
  - `openspec/changes/skill-system-p0-builtin-skills-executor/specs/skill-system-delta.md`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `apps/desktop/main/src/services/skills/`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/skills/packages/pkg.creonow.builtin/1.0.0/skills/`
  - `apps/desktop/renderer/src/stores/aiStore.ts`
  - `packages/shared/types/ai.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/**`（skill executor / IPC / store 场景）
- Breaking change: NO（沿用既有三段式执行/取消通道，补齐 P0 行为语义）
- User benefit: 技能执行链路从“单技能直连调用”升级为“可校验、可流式、可取消、可追踪”的统一执行基线。
