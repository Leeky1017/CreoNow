# 提案：s3-kg-last-seen

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 3（AR-C22）要求为 KG 实体补齐 `lastSeenState`，用于承接后续“章节完成后角色状态提取”的落库目标。当前实体模型缺少该字段，导致后续状态提取无法稳定写回，也无法在实体详情中可视化最近状态。

## 变更内容

- 在 KG 实体模型中新增可选字段 `lastSeenState`，并定义 `last_seen_state` 的数据库列映射。
- 增加数据库 migration，保证新旧项目都可读取/更新该字段。
- 在知识图谱实体详情面板展示并允许更新该字段。

## 受影响模块

- Knowledge Graph（Main）— 实体类型、写入服务与读取映射。
- Knowledge Graph（Renderer）— 实体详情 UI 的字段展示与提交流程。
- SQLite Migration（Main）— `kg_entities` 表结构升级与兼容性校验。

## 依赖关系

- 上游依赖：无。
- 下游依赖：`s3-state-extraction`（依赖 `lastSeenState` 字段完成状态回写）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-kg-last-seen（AR-C22）` 条目；
  - `openspec/specs/knowledge-graph/spec.md` 现有实体字段与 CRUD 契约。
- 核对项：
  - 新字段仅扩展实体模型，不破坏现有实体读写契约；
  - 命名映射统一为 `lastSeenState`（TS）↔ `last_seen_state`（DB）。
- 结论：`N/A（无上游依赖）`。

## 踩坑提醒（防复发）

- 避免只改类型不改 migration，造成“测试绿但运行时列缺失”的环境漂移。
- 避免在 UI 和主进程分别维护不同字段名，必须坚持单一映射规范。
- 避免把该字段做成必填，历史实体必须允许空值兼容。

## 代码问题审计重点

- [ ] 覆盖 migration + DAO + IPC 的端到端断言，禁止仅断言“返回非空”（`docs/代码问题/虚假测试覆盖率.md`）。
- [ ] 审计 `lastSeenState/last_seen_state` 命名一致性，禁止出现第三种别名造成风格漂移（`docs/代码问题/风格漂移与项目约定偏离.md`）。
- [ ] 增加“历史行无该列值”的回归测试，确认读取、更新和 UI 展示都不崩溃（`docs/代码问题/虚假测试覆盖率.md`）。

## 防治标签

- `FAKETEST` `DRIFT`

## 不做什么

- 不实现章节完成后的 LLM 状态提取逻辑（属于 `s3-state-extraction`）。
- 不扩展新的 KG IPC 通道，仅在现有实体读写契约内扩展字段。
- 不改动知识图谱关系（relation）模型与查询逻辑。

## 审阅状态

- Owner 审阅：`PENDING`
