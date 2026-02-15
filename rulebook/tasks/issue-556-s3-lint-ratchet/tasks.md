## 1. Implementation

- [x] 1.1 审阅 `AGENTS.md`、`openspec/project.md`、`docs/delivery-skill.md`、`openspec/specs/cross-module-integration-spec.md`
- [x] 1.2 审阅 `openspec/changes/s3-lint-ratchet/` 全部文件并完成 Dependency Sync Check（NO_DRIFT）
- [x] 1.3 按 TDD 新增 `CMI-S3-LR-S1/S2/S3` 测试并落盘 Red 失败证据
- [x] 1.4 实现 `scripts/lint-ratchet.ts`、更新 lint baseline、接入 CI 与 package script

## 2. Testing

- [x] 2.1 `pnpm exec tsx scripts/tests/lint-ratchet-baseline.test.ts`
- [x] 2.2 `pnpm exec tsx scripts/tests/lint-ratchet-regression.test.ts`
- [x] 2.3 `pnpm exec tsx scripts/tests/lint-ratchet-cross-session-guard.test.ts`
- [x] 2.4 `pnpm lint:ratchet`

## 3. Governance

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-556.md`（Red/Green、Dependency Sync、关键命令输出）
- [x] 3.2 更新 `openspec/changes/s3-lint-ratchet/tasks.md` 勾选状态
- [x] 3.3 执行 `rulebook task validate issue-556-s3-lint-ratchet` 并通过
- [ ] 3.4 Main Session Audit 最终签字（由主会话执行，不在本子任务提交范围）
