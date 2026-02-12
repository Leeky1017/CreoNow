# 提案：version-control-p4-hardening-boundary

## 背景

Version Control 全部功能（p0–p3）就绪后，需要统一硬化验收标准、异常矩阵与 NFR 场景，确保模块达到生产级可验收标准。

## 变更内容

- 模块级可验收标准硬化：
  - 快照写入 p95 < 120ms。
  - 历史列表查询 p95 < 200ms。
  - 两版本 Diff 计算 p95 < 350ms。
  - 分支合并（无冲突）p95 < 900ms。
  - TypeScript strict + zod，`version:*`/`version:branch:*`/`version:conflict:*` 通道必须由 zod 校验。
- 异常矩阵覆盖：
  - 网络/IO：快照写入失败、历史读取失败、合并结果写入失败。
  - 数据异常：快照损坏、Diff 输入非法、分支 head 缺失。
  - 并发冲突：同文档双分支并发合并、并发回滚。
  - 容量溢出：单文档快照超过 50,000 条。
  - 权限/安全：非当前项目分支访问、跨项目快照读取越权。
- NFR 场景绑定：
  - 并发合并触发串行锁（`documentId` 加锁）。
  - 快照容量超限自动压缩（7 天前 autosave 压缩，保留手动/AI/回滚快照）→ `VERSION_SNAPSHOT_COMPACTED`。
  - 多文档并行版本操作（最大并发 8）。
  - 超大 Diff 输入分块处理（2MB 超限 → `VERSION_DIFF_PAYLOAD_TOO_LARGE`）。
  - 并发回滚冲突 → `VERSION_ROLLBACK_CONFLICT`。
- 失败处理策略统一：
  - 数据一致性相关失败硬失败并阻断。
  - 可重试 IO 失败最多 3 次，超时 5s。
  - 失败后返回结构化错误并记录 rollback checkpoint。

## 受影响模块

- Version Control 全子模块

## 依赖关系

- 上游依赖：`version-control-p0` ~ `version-control-p3`
- 下游依赖：无

## 不做什么

- 不新增功能特性
- 不修改已通过的外部行为契约

## 审阅状态

- Owner 审阅：`PENDING`
