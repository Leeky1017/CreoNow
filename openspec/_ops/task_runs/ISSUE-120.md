# ISSUE-120
- Issue: #120
- Branch: task/120-memory-e2e-fix
- PR: <fill-after-created>

## Plan
- 修复 memory-preference-learning E2E 测试：在检查 memory-panel 前先切换到 memory 面板
- 验证 windows-e2e 全部通过 (27/27)

## Runs
### 2026-02-03 12:45 Analysis
- Root cause: `activeLeftPanel` defaults to `"sidebar"`, but test expects `memory-panel` visible
- Solution: Click `icon-bar-memory` button before asserting `memory-panel` visibility

### 2026-02-03 12:50 Implementation
- Command: Edit `memory-preference-learning.spec.ts` line 88
- Change: Add `await page.getByTestId("icon-bar-memory").click();` before visibility check
- Command: `pnpm typecheck`
- Key output: No errors
