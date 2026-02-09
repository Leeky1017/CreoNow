# 提案：context-engine-p1-token-budget-truncation

## 背景

在 CE-1 固化层契约后，需要进一步固定预算比例、最小保障、裁剪顺序与预算配置 IPC，避免不同调用链出现不一致裁剪行为。
若缺失该层，RAG 召回量、记忆注入量与即时上下文长度会在高负载下产生不确定输出，影响 AI 可重复性。

## 变更内容

- 固化预算比例与最小保障：`Rules/Settings/Retrieved/Immediate = 15/10/25/50`。
- 固化裁剪顺序：`Retrieved -> Settings -> Immediate`，`Rules` 不可裁剪。
- 固化 `context:budget:get` / `context:budget:update` IPC 契约与失败码。
- 固化 tokenizer 一致性约束，禁止预算计算使用与目标模型不一致的 tokenizer。

## 受影响模块

- Context Engine delta：`openspec/changes/context-engine-p1-token-budget-truncation/specs/context-engine-delta.md`
- Context Engine（后续实现阶段）：`apps/desktop/main/src/services/context/`
- IPC 契约（后续实现阶段）：`packages/shared/types/ipc/context.ts`
- Retrieval 预算消费侧（后续实现阶段）：`apps/desktop/main/src/services/rag/`

## 依赖关系

- 上游依赖：`context-engine-p0-layer-assembly-api`
- 下游依赖：
  - `context-engine-p2-stable-prefix-hash`
  - `context-engine-p3-constraints-rules-injection`
  - `context-engine-p4-hardening-boundary`

## Dependency Sync Check

- 核对输入：
  - `openspec/changes/context-engine-p0-layer-assembly-api/specs/context-engine-delta.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
- 核对项：数据结构、IPC 契约、错误码、阈值。
- 结论：`NO_DRIFT`。

## Out-of-scope

- Stable Prefix Hash 与缓存命中语义。
- Constraints CRUD 与 Rules 注入优先级。
- 跨项目安全阻断与背压策略。

## 审阅状态

- Owner 审阅：`PENDING`
