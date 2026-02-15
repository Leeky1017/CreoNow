# Search & Retrieval Specification Delta

## Change: s3-hybrid-rag

### Requirement: RAG 检索必须支持 Hybrid 召回融合与可解释重排 [MODIFIED]

系统必须在 `rag:retrieve` 路径中融合 FTS 与 semantic 两路召回结果，并输出与最终排序一致的可解释打分拆解。

#### Scenario: S3-HR-S1 Hybrid 策略执行融合去重与稳定排序 [MODIFIED]

- **假设** FTS 与 semantic 各返回一组候选 chunk，且存在重复项
- **当** 系统以 `hybrid` 策略执行检索
- **则** 结果按 `documentId + chunkId` 去重后再重排
- **并且** 排序结果在同输入下保持确定性

#### Scenario: S3-HR-S2 返回可解释 scoreBreakdown 且与最终排序一致 [ADDED]

- **假设** 检索结果包含 bm25、semantic、recency 三类分数贡献
- **当** 调用方请求 explain 信息
- **则** 每条结果返回 `scoreBreakdown`
- **并且** `scoreBreakdown` 与 `finalScore` 使用同源计算逻辑

### Requirement: Hybrid 结果必须遵守阈值与 token 预算约束 [ADDED]

系统必须在融合后执行阈值过滤和 token 预算截断，确保注入 Retrieved 层的数据可控。

#### Scenario: S3-HR-S3 超出 token 预算时按顺序截断 [ADDED]

- **假设** 融合结果总 token 超出 Retrieved 层预算
- **当** 系统准备注入 Context Engine
- **则** 按最终得分从高到低截断至预算上限
- **并且** 截断行为可重现且不破坏排序一致性

## Out of Scope

- 变更 Embedding Service 的 provider/fallback 编排细节
- Editor 与 Workbench 的 UI 交互改造
- 搜索替换（replace）功能扩展
