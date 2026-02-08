## 1. Specification

- [x] 1.1 审阅 `openspec/specs/memory-system/spec.md` 与 MS-2 delta
- [x] 1.2 完成 Dependency Sync Check（对齐 MS-1 schema/IPC/错误码/阈值）
- [x] 1.3 更新 proposal 审阅状态与 RUN_LOG 前置证据

## 2. TDD Mapping

- [x] 2.1 建立 10 个 Scenario → Test 映射（unit + integration）
- [x] 2.2 测试内标注 Scenario Mapping，保持可追踪
- [x] 2.3 记录 Red 失败证据后再进入 Green

## 3. Red

- [x] 3.1 新增 MS-2 目标测试并执行，确认因缺失实现失败
- [x] 3.2 记录失败点（缺少 semantic IPC/蒸馏 API/衰减导出）

## 4. Green

- [x] 4.1 实现语义蒸馏最小闭环（含 batch/manual/conflict）
- [x] 4.2 实现衰减纯函数与生命周期状态流转
- [x] 4.3 实现冲突队列与并发 WAL 写入隔离
- [x] 4.4 扩展 IPC 契约并生成 `ipc-generated.ts`

## 5. Refactor

- [x] 5.1 抽离共用校验（confidence/decay classification）
- [x] 5.2 稳定测试并修复并发用例波动

## 6. Evidence

- [x] 6.1 10 个 MS-2 场景测试全绿
- [x] 6.2 `typecheck` / `test:unit` / `test:integration` / `lint` 完成
- [x] 6.3 RUN_LOG 记录准入、Red、Green、门禁输出
