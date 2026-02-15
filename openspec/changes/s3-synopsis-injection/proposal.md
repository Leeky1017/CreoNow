# 提案：s3-synopsis-injection

## 背景

`docs/plans/unified-roadmap.md` 的 Sprint 3（AR-C25）要求将章节摘要持久化，并在续写时注入前几章摘要。当前 Context Engine 缺少摘要存储和 fetcher，导致续写只能依赖局部上下文，跨章一致性弱。

## 变更内容

- 新增 `synopsisStore`（SQLite）用于摘要持久化与检索。
- 新增 `synopsisFetcher`，在续写组装时注入前几章摘要。
- 在 `layerAssemblyService` 注册摘要 fetcher，明确空数据与失败降级语义。

## 受影响模块

- Context Engine（Main）— layer 组装、fetcher 注册、摘要注入策略。
- SQLite（Main）— synopsis 表结构与数据读写。
- Skill System / AI 调用链（Main）— 续写技能的上下文组装输入。

## 依赖关系

- 上游依赖：`s3-synopsis-skill`（提供摘要生成定义与输入输出约束）。
- 下游依赖：无硬依赖。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/changes/s3-synopsis-skill/specs/skill-system-delta.md`；
  - `docs/plans/unified-roadmap.md` 中 `s3-synopsis-injection（AR-C25）` 条目；
  - `openspec/specs/context-engine/spec.md` 的层组装与预算契约。
- 核对项：
  - `synopsis` 输出结构是否满足存储与注入前提；
  - 摘要注入是否可被预算裁剪且不破坏既有层优先级；
  - 存储/检索失败是否具备结构化降级信号。
- 结论：`PENDING（进入 Red 前复核；依赖上游交付状态）`。

## 踩坑提醒（防复发）

- 不要把 synopsis 注入链路拆为多层“透传函数”，应保持 fetcher 边界清晰。
- 不要在读取失败时回退到伪造摘要，失败必须显式可观测。
- 摘要注入顺序必须稳定（按章节顺序），避免上下文漂移。

## 代码问题审计重点

- [ ] 集成测试必须验证“摘要真实入库 + 续写真实注入”，禁止只断言 fetcher 被调用（`docs/代码问题/虚假测试覆盖率.md`）。
- [ ] 存储和检索异常必须输出结构化 warning/error，禁止静默 fallback（`docs/代码问题/静默失败与表面正确.md`）。
- [ ] 审计 helper 拆分数量与调用深度，禁止为单次逻辑引入多层抽象（`docs/代码问题/辅助函数滥用与过度抽象.md`）。
- [ ] 验证无摘要项目的续写路径仍可用且不会注入伪数据（`docs/代码问题/静默失败与表面正确.md`）。

## 防治标签

- `FAKETEST` `SILENT` `OVERABS`

## 不做什么

- 不在本 change 新增摘要生成算法（由 `s3-synopsis-skill` 提供）。
- 不改动 Rules/Settings 的业务语义，仅补充 synopsis 来源与注入。
- 不改动 Renderer 面板交互。

## 审阅状态

- Owner 审阅：`PENDING`
