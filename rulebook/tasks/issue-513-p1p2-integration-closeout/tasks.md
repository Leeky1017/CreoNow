## 1. Implementation

- [x] 1.1 在 `aiService` 主链路接入多轮消息组装与历史管理
- [x] 1.2 统一缺 API Key 的 `runSkill` 错误码语义
- [x] 1.3 确保 stream/non-stream 路径行为一致且不破坏现有 done 收敛

## 2. Testing

- [x] 2.1 先写并运行 Red：G1/G2/G3/G4/G5 + AIS-ERR-S1 失败用例
- [x] 2.2 实现最小修复并使新增用例 Green
- [x] 2.3 执行回归验证（新增集成、相关单测、类型与契约检查）

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-513.md`（Red/Green 与命令证据）
- [x] 3.2 更新 `docs/plans/p1p2-integration-check.md` 的未完成项状态与证据链接
