# Rulebook Spec Link — search-and-retrieval

- Source of truth: `openspec/changes/s3-onnx-runtime/specs/search-and-retrieval-delta.md`
- Covered scenarios:
  - `S3-ONNX-S1` ONNX Runtime 初始化成功并输出有效向量
  - `S3-ONNX-S2` 模型加载失败返回确定性错误
  - `S3-ONNX-S3` 维度不匹配阻断错误向量进入检索链路
- Contract note: `embedding:*` / `rag:*` IPC 通道及 envelope shape 保持不变，仅增强主进程内部 runtime 行为与错误映射。
