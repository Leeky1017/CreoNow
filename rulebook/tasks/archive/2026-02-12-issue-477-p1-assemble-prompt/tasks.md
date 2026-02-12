## 1. Implementation

- [x] 1.1 准入：创建并绑定 OPEN issue #477，创建 `task/477-p1-assemble-prompt` worktree
- [x] 1.2 以 `p1-assemble-prompt` 既定范围补齐 Red/Green 与最小实现修复（不扩展到其它 change）
- [x] 1.3 完成 change 文档收口：`tasks.md` 全章节、RUN_LOG、change 归档、`EXECUTION_ORDER` 同步

## 2. Testing

- [x] 2.1 Red：`assembleSystemPrompt.test.ts` 触发空 identity 占位分隔符失败
- [x] 2.2 Green：`assembleSystemPrompt.test.ts` 与 `identityPrompt.test.ts` 通过
- [x] 2.3 交付门禁：`scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-477.md`（含关键命令输入输出）
- [x] 3.2 提交 PR（Closes #477）+ auto-merge + main 收口 + Rulebook 归档
