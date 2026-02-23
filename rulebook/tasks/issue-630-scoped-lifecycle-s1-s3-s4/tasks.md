---
更新时间：2026-02-24 02:36

## 1. Specification / Governance

- [ ] 1.1 阅读并对齐 BE-SLA-S1/S3/S4 对应 spec（change + module spec），建立/确认 Scenario→测试映射入口
- [x] 1.2 创建 RUN_LOG `openspec/_ops/task_runs/ISSUE-630.md` 并补齐 Rulebook task（含时间戳门禁）
- [x] 1.3 Rulebook task validate 通过（`rulebook task validate issue-630-scoped-lifecycle-s1-s3-s4`）

## 2. Integration

- [ ] 2.1 合入 S1/S4 实现分支：`task/630-s1-s4-lifecycle`
- [ ] 2.2 合入 S3 实现分支：`task/630-s3-slot-recovery`
- [ ] 2.3 解决冲突并确保通过门禁对应的本地验证

## 3. Verification

- [ ] 3.1 跑关键契约/集成测试（以门禁脚本与对应测试文件为准）
- [ ] 3.2 跑 lint/typecheck（或门禁等价检查）确保 CI 可过

## 4. Delivery

- [ ] 4.1 创建 PR：`Implement scoped lifecycle S1/S3/S4 (#630)`（body 含 `Closes #630`）
- [ ] 4.2 开启 auto-merge 并跟踪 required checks 全绿
- [ ] 4.3 最终签字提交：仅修改 RUN_LOG，补齐 `## Main Session Audit` 且 `Reviewed-HEAD-SHA == HEAD^`
