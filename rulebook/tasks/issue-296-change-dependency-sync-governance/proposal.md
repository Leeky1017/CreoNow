# Proposal: issue-296-change-dependency-sync-governance

## Why

当前治理仅通过 `EXECUTION_ORDER.md` 约束串行顺序，但未强制“下游 change 在实现前核对上游产出并按需更新文档”。这会导致依赖漂移在 Red/Green 阶段才暴露，带来返工。

## What Changes

- 在 `AGENTS.md` 增加依赖同步检查（Dependency Sync Check）硬约束与禁止项。
- 在 `docs/delivery-skill.md` 增加依赖同步检查门禁、漂移先更新文档规则与异常处理条目。
- 在 `openspec/changes/_template/README.md` 和 `openspec/changes/_template/tasks.md` 固化依赖同步检查模板项。
- 在 `openspec/changes/_template/EXECUTION_ORDER.example.md` 增加依赖门禁说明。
- 在 `scripts/agent_pr_preflight.py` 增加对变更中的 `openspec/changes/*/tasks.md` 的依赖同步检查文案校验。
- 更新当前串行链（Memory / Project Management）任务卡，补齐 Dependency Sync Check 执行与证据项。

## Impact

- Affected specs:
  - `AGENTS.md`
  - `docs/delivery-skill.md`
  - `openspec/changes/_template/*`
  - `openspec/changes/EXECUTION_ORDER.md`
  - `openspec/changes/memory-system-*/tasks.md`
  - `openspec/changes/project-management-*/tasks.md`
- Affected code:
  - `scripts/agent_pr_preflight.py`
- Breaking change: NO
- User benefit: 串行依赖从“顺序约束”升级为“顺序+一致性约束”，减少下游实现返工。
