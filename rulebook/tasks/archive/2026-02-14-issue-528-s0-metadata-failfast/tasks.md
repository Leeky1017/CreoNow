## 1. Implementation

- [x] 1.1 在 `kgToGraph` 增加 metadata 解析 fail-fast（非法 JSON / 非对象 / 空字符串均不覆盖原串）
- [x] 1.2 在 `KnowledgeGraphPanel` 将 `parseMetadataJson` 改为 `Record<string, unknown> | null`，并让 timeline/node metadata 写入链路遇 `null` 时中止

## 2. Testing

- [x] 2.1 新增 `metadata-parse-failfast.test.tsx`，先 Red 再 Green 覆盖 `KG-S0-MFF-S1/S2`
- [x] 2.2 运行 KG 面板最小回归集，确认无行为回归

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/s0-metadata-failfast/tasks.md` 并记录证据
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-528.md` 与 `openspec/changes/EXECUTION_ORDER.md`，完成 change 归档
