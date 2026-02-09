# Proposal: issue-350-self-archive-nonrecursive-governance

## Why

当前治理流程对 Rulebook task 采用“必须 active + 完成后再归档”的串行约束，会在 closeout 场景形成递归（A 归档后遗留 B，B 再遗留 C）。需要将规则升级为同一任务可在同一 PR 内自归档，阻断递归 closeout。

## What Changes

- 修改 `scripts/agent_pr_preflight.py` 的 Rulebook 准入逻辑：当前任务支持 `active` 或 `archive` 两种合法位置。
- 当当前任务已归档时，preflight 改为结构完整性校验（`.metadata.json`/`proposal.md`/`tasks.md`），不再调用 `rulebook task validate`。
- 为 preflight 新增 Python 回归测试，覆盖 active-only、archive-only、active+archive 冲突、均不存在场景。
- 更新治理规则文档（`docs/delivery-skill.md`、`AGENTS.md`）为“同 PR 自归档，无需递归 closeout issue”。

## Impact

- Affected specs: `docs/delivery-skill.md`, `AGENTS.md`
- Affected code: `scripts/agent_pr_preflight.py`, `scripts/tests/test_agent_pr_preflight.py`
- Breaking change: NO
- User benefit: 治理任务可单任务闭环，减少遗留 active task 与重复 closeout 成本
