## 1. Implementation

- [x] 1.1 在 `embeddingService` 增加 primary/fallback policy 编排能力
- [x] 1.2 实现超时触发 fallback 的结构化 warning 语义
- [x] 1.3 实现 fallback 禁用时显式返回 `EMBEDDING_PROVIDER_UNAVAILABLE`
- [x] 1.4 对齐 IPC handler 对新错误码的降级分支处理
- [x] 1.5 同步 IPC 契约与生成类型，消除错误码漂移

## 2. Testing

- [x] 2.1 新增 S3-ES-S1 Red→Green 测试
- [x] 2.2 新增 S3-ES-S2/S3 Red→Green 测试
- [x] 2.3 回归 ONNX runtime 既有测试，确认无行为回归

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/s3-embedding-service/tasks.md`（含依赖同步检查与 TDD 状态）
- [x] 3.2 新增并更新 `openspec/_ops/task_runs/ISSUE-566.md`（Red/Green/验证证据）
- [x] 3.3 更新 `openspec/changes/s3-embedding-service/proposal.md` 依赖同步检查输入路径
