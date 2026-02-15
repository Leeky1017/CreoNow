# Proposal: issue-569-s3-search-panel

## Why

`s3-search-panel` 需要把 SearchPanel 从“可展示”补齐为“可用闭环”：用户输入查询后能看到稳定结果列表、点击结果能切换到目标文档、并能区分空结果与检索失败，避免把错误误判成无结果。

## What Changes

- 为 SearchPanel 增加可验证的结果项标识，支持稳定顺序断言与命中项点击验证。
- 保持查询结果渲染链路，补充 S1/S2 场景的自动化测试（查询展示、点击跳转）。
- 为 SearchPanel 增加独立错误态渲染与“重试搜索”入口，重试时执行 `clearError + runFulltext`。
- 新增三份场景测试文件并完成 Red → Green 证据链。

## Impact

- Affected specs:
  - `openspec/changes/s3-search-panel/specs/workbench-delta.md`
- Affected code:
  - `apps/desktop/renderer/src/features/search/SearchPanel.tsx`
  - `apps/desktop/renderer/src/features/search/__tests__/search-panel-query.test.tsx`
  - `apps/desktop/renderer/src/features/search/__tests__/search-panel-navigation.test.tsx`
  - `apps/desktop/renderer/src/features/search/__tests__/search-panel-status.test.tsx`
- Breaking change: NO
- User benefit:
  - SearchPanel 在“查询-结果-跳转-异常处理”路径可验证且可恢复，降低检索交互断链风险。
