## 1. Implementation

- [ ] 1.1 按 `AGENTS撰写.md` 重写 `AGENTS.md`（结构 ≤8 章、P1–P7 为核心、补充禁令 ≤5、外部化参考）
- [ ] 1.2 新增并回链 `docs/references/*`，并更新 `docs/delivery-rule-mapping.md` 的章节引用
- [ ] 1.3 增加 AI Service 回归测试（provider unavailable + stream/non-stream 多轮链路一致）

## 2. Testing

- [ ] 2.1 本地跑单测（覆盖新增 AI Service tests）
- [ ] 2.2 运行 `scripts/agent_pr_preflight.sh`（Rulebook validate / Issue OPEN / RUN_LOG 检查）

## 3. Documentation

- [ ] 3.1 新增 RUN_LOG：`openspec/_ops/task_runs/ISSUE-515.md`（记录关键命令输入输出）
- [ ] 3.2 PR 交付：PR body 包含 `Closes #515`，启用 auto-merge 并确认 required checks 全绿
