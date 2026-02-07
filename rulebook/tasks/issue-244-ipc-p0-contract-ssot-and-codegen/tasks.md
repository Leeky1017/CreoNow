## 1. Implementation

- [x] 1.1 增强 contract 生成脚本：校验命名、缺失 schema、重复通道、未注册绑定并返回稳定错误码
- [x] 1.2 保持生成输出 deterministic（重复生成无 diff）
- [x] 1.3 保持并验证 CI 漂移门禁 `pnpm contract:check`

## 2. Testing

- [x] 2.1 Red：先写并运行失败测试（缺失 schema / 重复通道 / 非法命名 / 未注册绑定）
- [x] 2.2 Green：实现后运行 `pnpm test:unit` 与 `pnpm contract:check` 全绿

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/ipc-p0-contract-ssot-and-codegen/tasks.md` 复选状态与映射
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-244.md`（命令与输出证据）
