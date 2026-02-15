## 1. Implementation

- [x] 1.1 新增内置技能资产 `builtin:synopsis`，对齐既有 builtin 包结构
- [x] 1.2 扩展 skill schema/loader，支持并校验 `output` 约束字段
- [x] 1.3 在执行链路对 `synopsis` 输出实施 200-300 字 + 单段 + 无噪音约束
- [x] 1.4 IPC 运行时解析链路透传 `output` 约束到 executor

## 2. Testing

- [x] 2.1 S3-SYN-SKILL-S1：新增 loader 测试验证 `synopsis` 可被加载
- [x] 2.2 S3-SYN-SKILL-S2：新增执行测试验证输出长度/格式约束
- [x] 2.3 S3-SYN-SKILL-S3：新增 loader 失败测试验证 schema 非法 fail-fast
- [x] 2.4 复跑受影响聚焦测试并记录证据

## 3. Governance

- [x] 3.1 更新 `openspec/changes/s3-synopsis-skill/tasks.md` 勾选状态
- [x] 3.2 新建 `openspec/_ops/task_runs/ISSUE-558.md`（含 Dependency Sync + Red/Green 证据）
- [x] 3.3 执行 `rulebook task validate issue-558-s3-synopsis-skill`
- [ ] 3.4 完成提交与推送（不创建 PR）
