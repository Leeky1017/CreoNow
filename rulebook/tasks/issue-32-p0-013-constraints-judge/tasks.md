## 1. Implementation

- [ ] 1.1 扩展 IPC contract + codegen（`constraints:*` / `judge:*`）
- [ ] 1.2 main：constraints IPC（SSOT `.creonow/rules/constraints.json`）
- [ ] 1.3 main：JudgeService + judge IPC（state machine + ensure）
- [ ] 1.4 DB：judge 相关表 + migration（不引入 constraints DB SSOT）
- [ ] 1.5 renderer：Settings UI 最小入口 + `JudgeSection`

## 2. Testing

- [ ] 2.1 Integration：constraints roundtrip + invalid args
- [ ] 2.2 Windows E2E：Settings 展示 judge 状态 + ensure 可测

## 3. Documentation

- [ ] 3.1 新增 `openspec/_ops/task_runs/ISSUE-32.md` 并持续追加 Runs（只追加不回写）
- [ ] 3.2 补齐 spec delta，并保持 `rulebook_task_validate` 通过
