# Proposal: issue-368-search-retrieval-p2-replace-versioned

## Why

`openspec/changes/search-retrieval-p2-replace-versioned` 定义了 SR3 的可回滚替换链路（预览必经、确认必经、全项目替换前逐文档快照），但主干目前仅有 FTS 查询/重建能力，尚无 `search:replace:preview/execute` 契约与执行路径。若不在本任务落地 SR3，后续 `search-retrieval-p3/p4` 将建立在缺失的替换基线之上，导致版本回滚保障与跨模块治理门禁无法收口。

## What Changes

- 新增并落地 SR3-R1-S1~S3 三个集成测试（先 Red 后 Green）。
- 在主进程补齐 `search:replace:preview` 与 `search:replace:execute` IPC 通道及参数校验。
- 实现 `currentDocument` / `wholeProject` 两种替换范围，以及 `regex` / `caseSensitive` / `wholeWord` 三开关。
- 固化全项目替换策略：必须基于预览结果执行；执行前为每个受影响文档创建快照，`reason=pre-search-replace`。
- 返回可判定执行回执：`replacedCount`、`affectedDocumentCount`、`snapshotIds[]`、`skipped[]`。
- 更新 IPC 合同定义与共享类型生成物，保持契约与实现一致。

## Impact

- Affected specs:
  - `openspec/changes/search-retrieval-p2-replace-versioned/**`
  - `openspec/specs/search-and-retrieval/spec.md`（只读取，不直接修改主 spec）
- Affected code:
  - `apps/desktop/main/src/services/search/**`
  - `apps/desktop/main/src/ipc/search.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/integration/search/**`
- Breaking change: YES（新增 `search:replace:*` IPC 契约并引入全项目替换执行门禁）
- User benefit: 支持可确认、可追溯、可回滚的全项目搜索替换，避免大范围误替换后不可恢复。
