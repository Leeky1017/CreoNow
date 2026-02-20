# document-management Specification Delta

## Change: aud-h6b-memory-document-decomposition

### Requirement: 文档 diff 计算拆分为可测试 helper 模块（Wave3 / H6B）[ADDED]

系统必须将文档 diff 计算相关逻辑从核心服务中拆分为独立 helper 模块，以实现：

- 可复用、可测试、可回归的 diff 行为契约
- 在固定输入下的确定性输出（避免 silent drift）
- 对“无变化”输入的显式收敛行为

拆分后的 helper 模块必须至少导出：

- `computeDiffHunks({ oldText, newText }) -> DiffHunk[]`
- `buildUnifiedDiff({ oldText, newText, oldLabel, newLabel }) -> { diffText, stats }`

#### Scenario: DOC-AUD-H6B-S1 单行替换产生单个 hunk，行内容可验证 [ADDED]

- **假设** old/new 文本仅有一处行级差异（例如 `beta -> gamma`）
- **当** 调用 `computeDiffHunks`
- **则** 返回 hunks 数量为 1
- **并且** hunk 的 `oldLines/newLines` 分别包含对应变更行

#### Scenario: DOC-AUD-H6B-S2 相同输入必须返回空 diff 与零统计 [ADDED]

- **假设** `oldText == newText`
- **当** 调用 `buildUnifiedDiff`
- **则** `diffText == ""`
- **并且** `stats == { addedLines: 0, removedLines: 0, changedHunks: 0 }`

