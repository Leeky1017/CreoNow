# 提案：s3-trace-persistence

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 3（AR-C26）要求持久化 `generation_traces` 与 `trace_feedback`。当前 AI 运行链路虽然产出 `traceId` 语义，但缺少稳定落库与反馈关联，导致问题回放、质量评估和复盘证据不完整。

## 变更内容

- 新增 `traceStore`，负责 `generation_traces` 与 `trace_feedback` 的 SQLite 读写。
- 在 AI 运行完成后持久化 trace 主记录，确保 `traceId` 可追踪。
- 提供反馈写入能力，并确保 feedback 与 trace 的关联完整性。

## 受影响模块

- AI Service（Main）— 生成完成后的 trace 持久化与结果回传。
- SQLite Migration（Main）— `generation_traces` 与 `trace_feedback` 表结构。
- Judge / 反馈链路（Main）— feedback 与 trace 的关联记录。

## 依赖关系

- 上游依赖：无。
- 下游依赖：无硬依赖。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-trace-persistence（AR-C26）` 条目；
  - `openspec/specs/ai-service/spec.md` 中 traceId 与 AI 结果契约。
- 核对项：
  - trace 持久化不破坏现有 AI 返回 envelope；
  - feedback 写入必须可追溯到具体 trace；
  - 持久化失败时具备显式可观测信号。
- 结论：`N/A（无上游依赖）`。

## 踩坑提醒（防复发）

- 不要只保留内存态 trace；必须验证数据库真实落地。
- 不要在落库失败时继续回传“完全成功”状态，需带上降级信号。
- feedback 写入必须校验 trace 关联，避免孤儿记录。

## 代码问题审计重点

- [ ] 测试必须验证 SQLite 实际写入与查询，不接受“mock DAO 被调用”作为唯一证据（`docs/代码问题/虚假测试覆盖率.md`）。
- [ ] 审计 trace 落库失败路径：必须返回结构化降级信息并记录日志，禁止静默吞错（`docs/代码问题/静默失败与表面正确.md`）。
- [ ] 审计 feedback 关联完整性（traceId 存在性、关联查询一致性），防止表面成功但数据不可追踪（`docs/代码问题/静默失败与表面正确.md`）。

## 防治标签

- `FAKETEST` `SILENT`

## 不做什么

- 不在本 change 改造 AI prompt 组装逻辑与技能执行策略。
- 不新增前端 trace 可视化 UI。
- 不扩展跨项目聚合分析，仅提供本地持久化基础能力。

## 审阅状态

- Owner 审阅：`PENDING`
