# 提案：s3-hybrid-rag

## 背景

现有检索能力已具备 FTS 与语义搜索基础，但在 RAG 场景中缺少统一的 hybrid 编排、去重与可解释重排输出，导致召回结果稳定性和可审计性不足。Sprint 3 需要收敛为可验证的 Hybrid RAG 管道，以提升召回质量并降低回归排查成本。

## 变更内容

- 在 `rag:retrieve` 路径引入 Hybrid RAG：融合 FTS 与 semantic 两路召回后统一重排。
- 明确去重、阈值过滤、token 预算截断顺序，并返回可解释 `scoreBreakdown`。
- 保持检索对外契约稳定，新增行为约束集中在检索策略与结果解释。

## 受影响模块

- Search & Retrieval（`apps/desktop/main/src/services/rag/`、`apps/desktop/main/src/services/search/`）— 增加 hybrid 编排与重排逻辑。
- IPC（`apps/desktop/main/src/ipc/rag.ts`、`apps/desktop/main/src/ipc/search.ts`）— 对齐 strategy/explain 行为。
- 测试（单元/集成）— 覆盖融合排序、阈值过滤、token 截断边界。

## 依赖关系

- 上游依赖：`s3-embedding-service`（统一 embedding 语义）。
- 横向依赖：`s3-onnx-runtime`（影响语义召回质量基线）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/changes/s3-embedding-service/specs/search-and-retrieval-delta.md`；
  - `openspec/specs/search-and-retrieval/spec.md` 中“两阶段召回 + 融合重排”要求。
- 核对项：
  - hybrid 编排是否复用统一 embedding 语义；
  - `scoreBreakdown` 是否可用于 explain 与调试；
  - 是否避免把单次转发逻辑拆成过多无收益抽象层。
- 结论：`NO_DRIFT`（在 embedding service 契约稳定前提下）。

## 踩坑提醒（防复发）

- 禁止把融合流程拆成大量“一次性 wrapper”造成调用链过深。
- 召回去重与截断顺序必须固定，避免回归时出现“同输入不同输出”。
- explain 字段必须与最终排序同源，禁止“显示分数”和“实际分数”脱钩。

## 代码问题审计重点

- 来自 `docs/代码问题/虚假测试覆盖率.md`：必须覆盖去重冲突、阈值边界、token 截断等非 Happy Path 场景。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：断言需验证排序与 `scoreBreakdown` 一致性，禁止仅断言结果非空。
- 来自 `docs/代码问题/辅助函数滥用与过度抽象.md`：审计只调用一次的辅助函数，避免新增无收益抽象层。
- 来自 `docs/代码问题/辅助函数滥用与过度抽象.md`：禁止引入 `utils/helpers/common` 垃圾抽屉文件承载检索核心逻辑。

## 防治标签

- `FAKETEST` `OVERABS`

## 不做什么

- 不修改 Editor/Workbench 的交互流程。
- 不新增与 Hybrid RAG 无关的搜索替换能力。
- 不在本 change 内扩展知识图谱 schema。

## 审阅状态

- Owner 审阅：`PENDING`
