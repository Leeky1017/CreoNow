# 提案：s3-state-extraction

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 3（AR-C23）要求在章节完成时由 LLM 提取角色状态变化并回写 KG。当前系统缺少该自动提取链路，角色状态只能手动维护，既容易滞后，也无法稳定驱动后续摘要和续写质量。

## 变更内容

- 新增 `stateExtractor` 服务，在章节完成事件触发后调用 LLM 提取角色状态变化。
- 将提取结果映射到 KG 实体 `lastSeenState`，仅更新可匹配实体。
- 为提取失败与非标准输出定义结构化降级信号，避免静默失败。

## 受影响模块

- Knowledge Graph（Main）— 状态提取、实体匹配与字段回写。
- AI Service（Main）— LLM 调用入口与超时/错误返回。
- Document Flow（Main）— 章节完成事件与提取触发点。

## 依赖关系

- 上游依赖：`s3-kg-last-seen`（提供 `lastSeenState` 字段与持久化能力）。
- 下游依赖：无硬依赖。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/changes/s3-kg-last-seen/specs/knowledge-graph-delta.md`；
  - `docs/plans/unified-roadmap.md` 中 `s3-state-extraction（AR-C23）` 条目；
  - `openspec/specs/knowledge-graph/spec.md` 的实体更新契约。
- 核对项：
  - 上游字段命名与落库映射是否稳定；
  - 提取结果回写是否只触达已存在实体；
  - 失败路径是否有结构化错误/告警而非吞错。
- 结论：`PENDING（进入 Red 前复核；依赖上游交付状态）`。

## 踩坑提醒（防复发）

- 不要把提取链路拆成多层“薄转发 helper”，否则排错路径会被拉长。
- 不要把 LLM 非结构化输出直接写库，必须先做 schema 校验和实体匹配。
- 章节完成主流程不能被提取失败阻断，但失败必须显式可观测。

## 代码问题审计重点

- [ ] Red 阶段至少覆盖三类失败：LLM 超时、返回脏数据、实体不匹配，禁止只测 Happy Path（`docs/代码问题/虚假测试覆盖率.md`）。
- [ ] 审计调用链深度，禁止新增“单次调用小函数”堆叠导致过度抽象（`docs/代码问题/辅助函数滥用与过度抽象.md`）。
- [ ] 校验失败必须输出结构化错误码与日志字段，禁止空 `catch` 或默认成功返回（`docs/代码问题/静默失败与表面正确.md`）。
- [ ] 增加章节完成到 KG 落库的集成测试，验证结果真实落地而非仅 mock 通过（`docs/代码问题/虚假测试覆盖率.md`）。

## 防治标签

- `FAKETEST` `OVERABS` `SILENT`

## 不做什么

- 不在本 change 引入新的 KG 实体类型或关系类型。
- 不实现摘要生成/注入逻辑（属于 `s3-synopsis-skill` 与 `s3-synopsis-injection`）。
- 不改动 UI 交互流程，仅聚焦主进程提取与回写能力。

## 审阅状态

- Owner 审阅：`PENDING`
