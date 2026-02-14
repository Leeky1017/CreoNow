# Proposal: issue-530-s0-kg-async-validate

## Why

`KnowledgeGraphPanel` 的多条异步写入链路在 `ok:false` 或 reject 时仍继续执行成功路径副作用，导致编辑态被错误清空、偏好被错误保存、批量更新部分失败不可观测。

## What Changes

- 对 `relationDelete`、`entityUpdate` 相关路径增加显式 `ok` 校验与 reject 兜底，失败时中止成功副作用。
- 批量 timeline 更新从 `Promise.all` 改为 `Promise.allSettled`，统计部分失败并输出可观测日志。
- 新增 `KG-S0-AV-S1/S2/S3` 对应测试，完成 Red→Green 证据闭环。

## Impact

- Affected specs: `openspec/changes/s0-kg-async-validate/specs/knowledge-graph-delta.md`
- Affected code: `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`, `apps/desktop/renderer/src/features/kg/__tests__/kg-async-validation.test.tsx`
- Breaking change: NO
- User benefit: 异步失败不再伪装成功，失败可观测，UI 状态与持久化状态一致性提高
