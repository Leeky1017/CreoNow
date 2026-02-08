# Governance Task Spec — issue-296-change-dependency-sync-governance

## Scope

强化串行依赖治理：为依赖 change 增加“执行前核对上游产出并按需更新文档”的强制门禁。

## Acceptance

- `AGENTS.md` 与 `docs/delivery-skill.md` 明确要求：有上游依赖时进入 Red 前必须完成 Dependency Sync Check。
- 发现依赖漂移时，必须先更新 change 文档（必要时更新 `EXECUTION_ORDER.md`）再实现。
- `openspec/changes/_template/tasks.md` 必须包含 Dependency Sync Check 任务项与证据项。
- `scripts/agent_pr_preflight.py` 对本次改动中的 `openspec/changes/*/tasks.md` 强制检查依赖同步文案。
- 当前活跃串行链（Memory / Project Management）任务卡应包含 Dependency Sync Check 条目。
