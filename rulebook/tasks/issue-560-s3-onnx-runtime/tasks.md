## 1. Implementation

- [x] 1.1 新增 ONNX runtime 初始化/推理适配层，统一 runtime 错误语义
- [x] 1.2 在 `embeddingService` 接入 ONNX 分支并保持 IPC envelope 不变
- [x] 1.3 在主进程启动阶段接入 ONNX runtime 配置入口（env 驱动）

## 2. Testing

- [x] 2.1 按 S3-ONNX-S1/S2/S3 先写 Red 测试并记录失败证据
- [x] 2.2 Green 后复跑 S1/S2/S3 测试全部通过
- [x] 2.3 回归验证 semantic fallback / rag retrieve / embedding incremental

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-560.md`（含 Red/Green 与依赖同步检查）
- [x] 3.2 更新 `openspec/changes/s3-onnx-runtime/tasks.md` 勾选状态
