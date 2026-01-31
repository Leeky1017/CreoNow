## 1. Implementation

- [ ] 1.1 Repro: `pnpm desktop:test:e2e` 并定位 `ai-apply.spec.ts` 失败根因（message ordering）
- [ ] 1.2 Main: 修复 skill prompt 注入：raw input 作为最后一条 user message
- [ ] 1.3 Add unit regression test 覆盖 ordering

## 2. Testing

- [ ] 2.1 Unit: 新增/更新测试并验证 red→green
- [ ] 2.2 E2E: `pnpm desktop:test:e2e`

## 3. Documentation

- [ ] 3.1 RUN_LOG: `openspec/_ops/task_runs/ISSUE-46.md`（append-only）
