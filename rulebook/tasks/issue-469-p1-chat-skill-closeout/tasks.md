## 1. Implementation

- [x] 1.1 审阅 `openspec/specs/skill-system/spec.md` 与 `openspec/changes/p1-chat-skill/*`，确认 S1~S7 与现有实现一致
- [x] 1.2 补全 `p1-chat-skill/tasks.md` 的 Red/Green/Refactor/Evidence 段并勾选完成
- [x] 1.3 将 `openspec/changes/p1-chat-skill` 归档到 `openspec/changes/archive/p1-chat-skill`
- [x] 1.4 同步更新 `openspec/changes/EXECUTION_ORDER.md`

## 2. Testing

- [x] 2.1 运行目标回归：
  - `pnpm exec tsx apps/desktop/main/src/services/skills/__tests__/skillRouter.test.ts`
  - `pnpm exec tsx apps/desktop/main/src/services/skills/__tests__/chatSkill.test.ts`
- [x] 2.2 运行 `scripts/agent_pr_preflight.sh` 完成门禁预检（含 type/lint/contract/cross-module/unit）

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-469.md` 记录全流程证据
- [ ] 3.2 完成 PR、auto-merge、main 收口，并将当前 Rulebook task 归档
