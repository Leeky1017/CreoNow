# RUN_LOG: Issue #207

## Meta

- **Issue**: https://github.com/Leeky1017/CreoNow/issues/207
- **Branch**: `task/207-e2e-scope-assertions`
- **PR**: https://github.com/Leeky1017/CreoNow/pull/208

## Plan

修复 E2E 测试中的 Playwright 严格模式违规：
- 将 `page.getByText()` 断言限定在 `outlinePanel` 定位器范围内
- 避免同时匹配编辑器和大纲面板中的相同文本

## Runs

### Run 1: 2026-02-05

**Goal**: 修复严格模式违规

**Steps**:
1. 在每个测试中创建 `outlinePanel` 定位器
2. 将所有 `getByText()` 断言改为 `outlinePanel.getByText()`

**Evidence**:
- 修复已应用
