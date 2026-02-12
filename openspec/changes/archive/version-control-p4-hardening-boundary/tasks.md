## 1. Specification

- [x] 1.1 审阅主 spec `version-control/spec.md` 中「模块级可验收标准」的量化阈值、边界与类型安全、失败处理策略
- [x] 1.2 审阅主 spec 中「异常与边界覆盖矩阵」的 5 类覆盖要求及 Scenario（2 个）
- [x] 1.3 审阅 NFR 中 Performance / Capacity / Security / Concurrency 全部指标及 Scenario（2 个）
- [x] 1.4 审阅错误码完整集合（`VERSION_MERGE_TIMEOUT` / `VERSION_SNAPSHOT_COMPACTED` / `VERSION_DIFF_PAYLOAD_TOO_LARGE` / `VERSION_ROLLBACK_CONFLICT` / `DB_ERROR`）
- [x] 1.5 依赖同步检查（Dependency Sync Check）：上游 `version-control-p0` ~ `version-control-p3`；核对错误码、IPC schema、并发/容量配置（结论：`NO_DRIFT`）

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S「快照与 Diff 指标达标」→ `apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`（并在 RUN_LOG 记录 p95 基准）
- [x] 2.2 S「数据库故障时保持可恢复状态」→ `apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`（`testSnapshotCreateIoRetry`）
- [x] 2.3 S「并发合并触发串行锁」→ `apps/desktop/main/src/ipc/version.ts` 文档级锁实现 + `apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`（并发冲突）
- [x] 2.4 S「快照容量超限自动压缩」→ `apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`（`testSnapshotCompactionAtCapacityBoundary`）
- [x] 2.5 S「多文档并行版本操作」→ `apps/desktop/main/src/ipc/version.ts`（全局并发槽 + document 级串行）
- [x] 2.6 S「超大 Diff 输入分块处理」→ `apps/desktop/tests/unit/version-hardening-boundary.ipc.test.ts`（`testLargeDiffPayloadRejected`）

## 3. Red（先写失败测试）

- [x] 3.1 编写性能与阈值相关失败测试入口（P4 专项测试文件）
- [x] 3.2 编写异常矩阵（数据库故障/快照损坏路径）失败测试
- [x] 3.3 编写并发场景（并发回滚冲突）失败测试
- [x] 3.4 编写容量场景（快照超限压缩/超大 Diff）失败测试
- [x] 3.5 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 实现 documentId 级串行锁（`merge`/`rollback`/`snapshot` 互斥）
- [x] 4.2 实现快照容量超限自动压缩（7 天前 `autosave` 压缩）
- [x] 4.3 实现超大 Diff 输入检测 → `VERSION_DIFF_PAYLOAD_TOO_LARGE`
- [x] 4.4 实现并发回滚冲突检测 → `VERSION_ROLLBACK_CONFLICT`
- [x] 4.5 实现 IO 失败重试（最多 3 次、超时 5s）
- [x] 4.6 补齐所有 `version:*` 通道的 request/response schema 声明（`ipc-contract` + runtime validation）

## 5. Refactor（保持绿灯）

- [x] 5.1 统一错误返回与重试/并发控制辅助逻辑（`version.ts`）
- [x] 5.2 全量回归保持绿灯（`typecheck`/`lint`/`contract:check`/`cross-module:check`/`test:unit`/`apps/desktop test:run`）

## 6. Evidence

- [x] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作
- [x] 6.3 记录性能基准测试结果（快照写入 / 列表查询 / Diff 计算 / 合并延迟）
