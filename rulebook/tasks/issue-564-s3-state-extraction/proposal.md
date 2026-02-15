# Proposal: issue-564-s3-state-extraction

## Why

Sprint 3 `s3-state-extraction`（AR-C23）要求在章节完成时自动提取角色状态变化并回写 KG `lastSeenState`，否则角色状态只能依赖手工维护，无法稳定支撑后续摘要与续写一致性。

## What Changes

- 新增主进程服务 `stateExtractor`：调用状态提取能力、执行 schema 校验、匹配 KG 实体并回写 `lastSeenState`。
- 新增章节完成集成函数：仅在章节状态到 `final` 时触发状态提取，主流程不被阻断。
- 新增结构化失败/告警信号：
  - 提取超时/失败/脏输出返回明确降级错误码；
  - 未匹配角色跳过并记录包含角色名与章节上下文的结构化 warning。
- 新增 S1/S2/S3 测试并完成 Red→Green 证据闭环。

## Impact

- Affected specs:
  - `openspec/changes/s3-state-extraction/specs/knowledge-graph-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/kg/stateExtractor.ts`
  - `apps/desktop/main/src/services/kg/__tests__/stateExtractor.test.ts`
  - `apps/desktop/main/src/services/kg/__tests__/stateExtractor.integration.test.ts`
  - `apps/desktop/main/src/ipc/file.ts`
  - `apps/desktop/main/src/index.ts`
- Breaking change: NO
- User benefit:
  - 章节完成后角色状态可自动同步到 KG，且失败路径可观测、不阻断创作主流程。
