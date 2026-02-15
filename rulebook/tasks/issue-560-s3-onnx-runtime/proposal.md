# Proposal: issue-560-s3-onnx-runtime

## Why

Sprint 3 的 `s3-embedding-service` 与 `s3-hybrid-rag` 依赖稳定的本地嵌入推理底座。当前实现仅有 hash baseline，缺少 ONNX Runtime 初始化、推理与维度校验的统一错误语义，导致运行时行为不可预测，且错误可观测性不足。

## What Changes

- 在 `apps/desktop/main/src/services/embedding/` 引入 ONNX runtime 适配层，提供延迟初始化与单一入口推理。
- 在 `createEmbeddingService` 接入 ONNX 模型分支，统一将 runtime 错误映射为既有 IPC 错误 envelope（不修改通道契约）。
- 增加 S3-ONNX-S1/S2/S3 测试覆盖（初始化成功、模型加载失败、维度不匹配）。
- 保持 `embedding:*` / `rag:*` 通道形状不变，并验证 semantic/RAG 现有降级行为不回归。

## Impact

- Affected specs: `openspec/changes/s3-onnx-runtime/specs/search-and-retrieval-delta.md`
- Affected code:
  - `apps/desktop/main/src/services/embedding/onnxRuntime.ts`
  - `apps/desktop/main/src/services/embedding/embeddingService.ts`
  - `apps/desktop/main/src/index.ts`
  - `apps/desktop/main/src/services/embedding/__tests__/onnx-runtime.*.test.ts`
- Breaking change: NO
- User benefit: 本地语义检索链路具备可复现的 ONNX runtime 初始化/推理能力，并在失败场景返回确定性错误语义与结构化日志。
