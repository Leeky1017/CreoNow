# 提案：s3-onnx-runtime

## 背景

Search & Retrieval 当前的嵌入生成链路在运行时选择、模型加载和向量维度校验上缺乏统一约束，导致本地推理能力不可预测，且不同路径的行为一致性较弱。Sprint 3 需要先落地可复现的 ONNX Runtime 运行时底座，作为后续 Embedding Service 与 Hybrid RAG 的稳定前提。

## 变更内容

- 引入 ONNX Runtime 作为本地嵌入推理运行时，并定义统一初始化与健康检查入口。
- 统一模型加载、向量维度校验与错误语义，消除“同一错误多种表现”的漂移。
- 保持现有 `embedding:*` / `rag:*` IPC 契约不变，仅替换主进程内部运行时实现。

## 受影响模块

- Search & Retrieval（`apps/desktop/main/src/services/embedding/`）— 增加 ONNX 运行时初始化、推理与校验流程。
- IPC（`apps/desktop/main/src/ipc/embedding.ts`、`apps/desktop/main/src/ipc/rag.ts`）— 保持契约不变，补齐运行时错误映射。
- 测试（单元/集成）— 增加 ONNX 初始化失败、维度不匹配、成功路径三类验证。

## 依赖关系

- 上游依赖：无（可独立交付）。
- 下游依赖：`s3-embedding-service`、`s3-hybrid-rag` 复用该运行时能力。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/specs/search-and-retrieval/spec.md` 中“向量嵌入与语义搜索”约束；
  - Sprint 3 change 命名与分工边界（runtime 底座先于 service 编排）。
- 核对项：
  - 是否仅变更主进程内部运行时，不扩展 UI 和 IPC 表面；
  - 是否为后续 change 提供稳定、可观测的错误语义；
  - 是否保留现有语义搜索行为契约。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 禁止把 ONNX 初始化失败静默降级为“空向量成功返回”；失败必须可观测。
- 模型路径、维度、provider 配置需集中管理，避免各调用点各自解析导致漂移。
- 不要在 IPC handler 内重复拼装运行时错误；统一由 embedding runtime/service 映射。

## 代码问题审计重点

- 来自 `docs/代码问题/虚假测试覆盖率.md`：必须有错误路径断言（初始化失败、维度不匹配），禁止只断言“返回向量非空”。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：避免全 Mock 的空转测试，至少保留可验证的 runtime 行为测试（包含失败语义）。
- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：错误 envelope 与日志字段命名必须沿用项目既有规范，禁止新增平行风格。
- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：文件组织遵循现有 `services/embedding` 结构，不引入临时 `utils/common` 抽屉文件。

## 防治标签

- `FAKETEST` `DRIFT`

## 不做什么

- 不在本 change 内改动 Hybrid RAG 排序公式。
- 不新增或修改 Renderer 搜索面板交互。
- 不引入新的外部 embedding provider。

## 审阅状态

- Owner 审阅：`PENDING`
