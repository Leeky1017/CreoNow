## 1. Specification

- [x] 1.1 审阅并确认 `s3-hybrid-rag` 边界：仅覆盖 hybrid 召回、融合重排与 explain 输出。
- [x] 1.2 审阅并确认错误与边界路径：去重冲突、阈值过滤、token 预算截断均需可验证。
- [x] 1.3 审阅并确认验收阈值：排序结果稳定、`scoreBreakdown` 可解释且与最终排序同源。
- [x] 1.4 完成依赖同步检查（Dependency Sync Check）并记录结论（对齐 `s3-embedding-service`）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例。
- [x] 2.2 为每个测试标注 Scenario ID，建立可追踪关系。
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现。

### Scenario → 测试映射

- [x] `S3-HR-S1`：`apps/desktop/main/src/services/rag/__tests__/hybrid-rag.merge.test.ts` → `merges fts and semantic recall with deterministic dedupe and ordering`
- [x] `S3-HR-S2`：`apps/desktop/main/src/services/rag/__tests__/hybrid-rag.explain.test.ts` → `returns scoreBreakdown aligned with final ranking`
- [x] `S3-HR-S3`：`apps/desktop/main/src/services/rag/__tests__/hybrid-rag.truncate.test.ts` → `applies token budget truncation deterministically`

## 3. Red（先写失败测试）

- [x] 3.1 新增 `S3-HR-S1` 失败测试，验证当前融合去重顺序约束缺失。
- [x] 3.2 新增 `S3-HR-S2` 失败测试，验证 explain 与排序一致性约束缺失。
- [x] 3.3 新增 `S3-HR-S3` 失败测试，验证预算截断边界行为。
- [x] 3.4 运行最小测试集并记录 Red 证据（命令 + 失败输出）。

## 4. Green（最小实现通过）

- [x] 4.1 落地最小 hybrid 编排逻辑，使 `S3-HR-S1/S2/S3` 转绿。
- [x] 4.2 实现统一去重、排序、阈值过滤和截断顺序。
- [x] 4.3 复跑 Scenario 对应测试并确认通过。

## 5. Refactor（保持绿灯）

- [x] 5.1 合并重复评分计算路径，保证 explain 与最终分数同源。
- [x] 5.2 清理一次性辅助函数，避免过度抽象导致链路不可读。
- [x] 5.3 回归受影响检索/RAG 测试，确认契约无回归。

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）。
- [x] 6.2 记录依赖同步检查（Dependency Sync Check）输入、核对项、结论与后续动作。
- [x] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG。

### Evidence Notes

- 依赖同步检查（Dependency Sync Check）输入：
  - `openspec/changes/archive/s3-embedding-service/specs/search-and-retrieval-delta.md`
  - `openspec/changes/archive/s3-onnx-runtime/specs/search-and-retrieval-delta.md`
  - `openspec/specs/search-and-retrieval/spec.md`
- 核对项：
  - embedding/provider 错误语义（`MODEL_NOT_READY` / `EMBEDDING_PROVIDER_UNAVAILABLE`）是否保持兼容；
  - ONNX runtime 输出维度与语义检索输入契约是否未漂移；
  - hybrid 融合排序/解释是否保持同源实现且无额外跨层抽象。
- 结论：`NO_DRIFT`
- 后续动作：按 S3-HR-S1/S2/S3 执行 Red→Green，实现最小 hybrid RAG 融合与预算截断。
