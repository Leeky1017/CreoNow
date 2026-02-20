# context-engine Specification Delta

## Change: aud-m2-shared-token-budget-helper

### Requirement: token 估算/截断必须使用共享 helper 防止跨层漂移（Wave0 / M2）[ADDED]

系统必须将 token 预算估算与截断能力收敛到共享模块（`@shared/tokenBudget`），以避免 main/renderer/rag 的口径漂移。至少满足：

- 关键路径必须导入并使用 `@shared/tokenBudget`。
- 禁止在关键路径中定义私有 token 估算函数，避免隐藏漂移点。

#### Scenario: CE-AUD-M2-S1 main/renderer/rag 必须导入共享 tokenBudget helper 且不得定义私有估算器 [ADDED]

- **假设** 检查以下源码：
  - `apps/desktop/main/src/services/context/layerAssemblyService.ts`
  - `apps/desktop/renderer/src/lib/ai/contextAssembler.ts`
  - `apps/desktop/main/src/services/rag/ragService.ts`
- **当** 查找 token 估算/截断实现
- **则** 必须包含 `@shared/tokenBudget` 导入
- **并且** 不得存在私有 `estimateTokenCount/estimateTokens` 函数定义
