## 1. Implementation

- [x] 1.1 归档已完成 IPC P0 change 到 `openspec/changes/archive/`
- [x] 1.2 在 `agent_pr_preflight.py` 增加“完成变更未归档”阻断
- [x] 1.3 在 `openspec-log-guard` workflow 增加同等阻断

## 2. Testing

- [x] 2.1 本地执行归档门禁脚本校验（完成变更不再被识别为活跃）
- [x] 2.2 运行 `scripts/agent_pr_preflight.sh`（预期在 PR 回填前仅因 RUN_LOG PR 占位符阻断）
- [x] 2.3 运行 `pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm test:unit`

## 3. Documentation

- [x] 3.1 更新 `docs/delivery-skill.md`，新增“完成变更归档强制”规则
- [x] 3.2 更新 `scripts/README.md`，反映 preflight 新校验项
- [x] 3.3 更新 `openspec/_ops/task_runs/ISSUE-252.md` 记录证据
