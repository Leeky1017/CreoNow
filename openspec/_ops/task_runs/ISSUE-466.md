# ISSUE-466
- Issue: #466
- Branch: task/466-fix-skill-test
- PR: https://github.com/Leeky1017/CreoNow/pull/467

## Plan
- 修复 skill-executor.test.ts 中 builtin skill 清单缺少 chat 的断言失败

## Runs
### 2026-02-12 22:48 修复测试
- Command: `multi_edit skill-executor.test.ts`
- Key output: 将 expected skill list 从 8 个更新为 9 个（添加 "chat"）
