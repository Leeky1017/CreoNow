# ISSUE-786

更新时间：2026-02-28 20:00

- Issue: #786
- Branch: task/786-fe-hotfix-searchpanel-backdrop-close
- PR: <fill-after-created>

## Plan

- Red：写 SearchPanel.visibility.test.tsx + SearchPanel.close.test.tsx，确认失败
- Green：SearchPanel.tsx 加 open 短路 + backdrop data-testid；Sidebar.tsx 传入 open/onClose
- Refactor：open 改为必选 prop；验证全量测试通过

## Runs
