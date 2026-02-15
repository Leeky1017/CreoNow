# 提案：s3-embedding-service

## 背景

当前 embedding 相关逻辑分散在 IPC handler、RAG 调用路径与若干内部调用点，导致 provider 选择、fallback 策略和错误处理语义不一致。该分散结构容易引发“静默降级 + 表面成功”，并使后续 Hybrid RAG 对嵌入质量的依赖失去可控性。

## 变更内容

- 新增统一 Embedding Service，集中承接 provider 选择、请求编排和结果校验。
- 定义显式 fallback 策略：仅在配置允许且满足触发条件时降级，不允许隐式吞错。
- 统一 `embedding:*` 与 `rag:*` 路径中的 embedding 错误码和 warning 载荷结构。

## 受影响模块

- Search & Retrieval（`apps/desktop/main/src/services/embedding/`）— 新增/重构 Embedding Service 编排层。
- IPC（`apps/desktop/main/src/ipc/embedding.ts`、`apps/desktop/main/src/ipc/rag.ts`）— 对齐服务化后的错误映射与日志字段。
- 测试（单元/集成）— 覆盖 primary 成功、fallback 触发、fallback 禁用三类路径。

## 依赖关系

- 上游依赖：`s3-onnx-runtime`（提供稳定本地运行时能力）。
- 下游依赖：`s3-hybrid-rag` 依赖统一 Embedding Service 行为语义。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/changes/s3-onnx-runtime/specs/search-and-retrieval-delta.md`；
  - `openspec/specs/search-and-retrieval/spec.md` 中“嵌入模型不可用时的降级”约束。
- 核对项：
  - fallback 是否“显式可配置”且可审计；
  - fallback 触发/未触发路径是否都有确定性测试；
  - 是否避免在调用方重复编排 provider 选择。
- 结论：`NO_DRIFT`（以 `s3-onnx-runtime` 约束为前提）。

## 踩坑提醒（防复发）

- 禁止 `catch { return [] }` / `return null` 这类静默 fallback。
- fallback warning 必须携带 `primaryProvider`、`fallbackProvider`、`reason`，便于追踪。
- fallback 禁用时必须明确失败，不得“看起来成功但结果为空”。

## 代码问题审计重点

- 来自 `docs/代码问题/过度防御性降级与保守回退.md`：逐个审计 `catch` 和默认值兜底，禁止未经设计审批的隐式降级。
- 来自 `docs/代码问题/静默失败与表面正确.md`：关键链路需验证“结果落地”而非仅验证函数返回成功。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：每个 Scenario 至少覆盖一个错误路径断言，避免只测 Happy Path。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：避免 Mock 过度导致 fallback 分支失真，保留可验证的服务编排测试。

## 防治标签

- `FALLBACK` `FAKETEST` `SILENT`

## 不做什么

- 不调整 Hybrid RAG 排序权重与解释字段定义。
- 不改动 Renderer 搜索模式切换 UI。
- 不新增与 Embedding Service 无关的 IPC 通道。

## 审阅状态

- Owner 审阅：`PENDING`
