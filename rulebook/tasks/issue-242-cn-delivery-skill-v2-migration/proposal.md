# Proposal: issue-242-cn-delivery-skill-v2-migration

## Why

CreoNow 交付规则、外部 Skill、CI 门禁上下文存在历史漂移，导致“文档口径”和“实际 required checks”不一致，影响自动化交付稳定性与审计一致性。

## What Changes

- 将 `docs/delivery-skill.md` 固化为交付规则主源
- 重写外部 Skill 为 CN 声明式规则，移除旧模板残留与命令手册内容
- 对齐 `AGENTS.md` 的交付与异常处理条款
- 落地 canonical checks：`ci`、`openspec-log-guard`、`merge-serial`
- 强化 `agent_pr_preflight.py`：Rulebook task 缺失或校验失败即阻断
- 新增规则映射矩阵文档便于审计回归

## Impact

- Affected specs: N/A（流程治理与交付规则文档升级）
- Affected code: `.github/workflows/**`, `scripts/agent_pr_preflight.py`, `docs/**`, `AGENTS.md`
- Breaking change: YES（流程门禁收紧，旧流程将被阻断）
- User benefit: 交付规则单一真相源、门禁命名统一、审计与执行可追溯
