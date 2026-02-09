## 1. Implementation

- [ ] 1.1 在 `scripts/agent_pr_preflight.py` 增加 Rulebook task 位置解析（active/archive）
- [ ] 1.2 在 archive 场景增加结构完整性校验并接入主流程
- [ ] 1.3 更新治理规则文档：`docs/delivery-skill.md`、`AGENTS.md`

## 2. Testing

- [ ] 2.1 先写 `scripts/tests/test_agent_pr_preflight.py` 并运行失败（Red）
- [ ] 2.2 完成实现后重跑 `python3 -m unittest scripts/tests/test_agent_pr_preflight.py -v`（Green）
- [ ] 2.3 运行 `scripts/agent_pr_preflight.sh` 验证门禁

## 3. Documentation

- [ ] 3.1 新增 `openspec/_ops/task_runs/ISSUE-350.md` 记录 Red/Green 与合并证据
- [ ] 3.2 回填真实 PR 链接并记录 main 收口
