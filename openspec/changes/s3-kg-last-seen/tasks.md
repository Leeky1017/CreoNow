## 1. Specification

- [x] 1.1 审阅并确认 `s3-kg-last-seen` 边界：仅新增实体 `lastSeenState` 字段、migration 与 UI 展示
- [x] 1.2 审阅并确认兼容性路径：历史实体无该字段时读写与展示必须稳定
- [x] 1.3 审阅并确认不可变契约：既有 KG 实体 CRUD 与 IPC 语义不被破坏
- [x] 1.4 在进入 Red 前完成依赖同步检查（Dependency Sync Check），记录“无漂移/已更新”；无上游依赖时标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S3-KGLS-S1 `更新实体时写入 lastSeenState 并可读回 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/kgWriteService.last-seen.test.ts`
  - 测试名：`writes and reads back entity lastSeenState`
- [x] S3-KGLS-S2 `历史实体无 lastSeenState 时保持兼容 [ADDED]`
  - 测试文件：`apps/desktop/main/src/services/kg/__tests__/kgEntity.compatibility.test.ts`
  - 测试名：`legacy entities without lastSeenState remain readable and updatable`

## 3. Red（先写失败测试）

- [x] 3.1 编写 S3-KGLS-S1 失败测试，先验证当前未写入/未回读 `lastSeenState`
- [x] 3.2 编写 S3-KGLS-S2 失败测试，先验证历史实体兼容路径未被覆盖
- [x] 3.3 运行最小测试集并记录 Red 证据（含 migration 前后行为差异）

## 4. Green（最小实现通过）

- [x] 4.1 增加 `kg_entities.last_seen_state` migration 与类型映射
- [x] 4.2 修改 KG 实体读写链路，打通 `lastSeenState` 的持久化回路
- [x] 4.3 修改实体详情 UI，支持展示与更新该字段

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛字段映射逻辑到单一入口，避免命名分叉
- [x] 5.2 清理重复转换代码，保持 KG 实体模型一致性

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [x] 6.3 记录 migration 升级与历史数据兼容验证证据
