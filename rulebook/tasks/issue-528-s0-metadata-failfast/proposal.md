# Proposal: issue-528-s0-metadata-failfast

## Why
KG Renderer 在解析 `metadataJson` 失败时会回退 `{}` 并继续写入位置/时间线字段，可能覆盖用户已有 metadata，造成静默数据丢失。

## What Changes
- `kgToGraph.updatePositionInMetadata` 对非法/非对象 metadata 执行 fail-fast：保留原始字符串并记录截断日志。
- `KnowledgeGraphPanel.parseMetadataJson` 非法输入返回 `null`。
- Timeline 与节点位置保存链路在 metadata 解析失败时停止 `entityUpdate` 写入。
- 增加针对 Red/Green 的回归测试覆盖 `KG-S0-MFF-S1`、`KG-S0-MFF-S2`。

## Impact
- Affected specs: `openspec/changes/s0-metadata-failfast/specs/knowledge-graph-delta.md`
- Affected code: `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`, `apps/desktop/renderer/src/features/kg/kgToGraph.ts`, `apps/desktop/renderer/src/features/kg/metadata-parse-failfast.test.tsx`
- Breaking change: NO
- User benefit: 非法 metadata 不再被覆盖，数据丢失风险从“静默覆盖”降级为“显式 fail-fast”
