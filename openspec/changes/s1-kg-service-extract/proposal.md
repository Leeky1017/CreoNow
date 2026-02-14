# 提案：s1-kg-service-extract

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 1 将 `s1-kg-service-extract`（A7-C-003）定义为 KG 架构解锁项：`createKnowledgeGraphService` 当前承载查询、写入、约束校验与上下文注入等混合职责，文件体量和复杂度过高，已成为后续迭代（检索策略演进、写路径治理、上下文注入稳定性）的主要风险点。

若继续在单体 `kgService.ts` 上叠加能力，会扩大回归面并提高定位成本，违背 Sprint 1 “先提取、后扩展”的治理目标。

## 变更内容

- 新增 `apps/desktop/main/src/services/kg/types.ts`，提取并集中维护 KG 共享类型与关键常量导出。
- 新增 `apps/desktop/main/src/services/kg/kgQueryService.ts`，承接 `querySubgraph/queryPath/queryValidate/queryRelevant/queryByIds/buildRulesInjection` 等查询与注入能力。
- 新增 `apps/desktop/main/src/services/kg/kgWriteService.ts`，承接实体与关系写路径（create/read/update/delete/list）能力。
- 将 `apps/desktop/main/src/services/kg/kgService.ts` 收敛为门面层（facade），保留 `KnowledgeGraphService` 外部接口与返回包络语义不变，通过显式委托连接 query/write 子服务。

## 受影响模块

- Knowledge Graph（`apps/desktop/main/src/services/kg/`）— `kgService.ts` 职责收敛并新增 query/write/types 子模块。
- Context Engine（`apps/desktop/main/src/services/context/`）— 继续消费 KG 的规则注入能力，需验证 `buildRulesInjection` 导出可见性与引用路径稳定。
- KG 测试（`apps/desktop/main/src/services/kg/__tests__/`）— 增补职责拆分、门面委托与关键导出可见性的回归测试。

## 依赖关系

- 上游依赖：无硬依赖（roadmap 标注为独立项）。
- 执行建议：建议在 `s1-path-alias` 后推进，减少提取过程中的 import 路径噪声。
- 横向协同：与 `s1-runtime-config` 在 `kgService.ts` 可能存在同文件冲突，需错峰合入。
- 下游依赖：`s2-kg-context-level` 与 `s2-kg-aliases` 建议建立在本次提取后的模块边界上继续推进。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-kg-service-extract` 条目与 Sprint 1 依赖图；
  - `openspec/specs/knowledge-graph/spec.md` 中实体/关系查询写入与 `knowledge:query:*` 契约；
  - `openspec/specs/context-engine/spec.md` 中 KG 规则注入依赖语义。
- 核对项：
  - 变更范围限定在 `query/write/types/facade` 拆分，不扩展业务功能或修改 IPC 行为契约。
  - `KnowledgeGraphService` 对外方法签名、返回 `ServiceResult` 包络与错误语义保持不变。
  - `buildRulesInjection` 及关键类型/常量提取后仍可从稳定路径可见，避免下游出现隐性断链。
  - `queryRelevant` 对实体详情依赖通过显式组合或依赖注入维持，不引入重复实现分叉。
- 结论：`NO_DRIFT`（可进入 TDD 规划）。

## 踩坑提醒（防复发）

- `queryRelevant` 可能依赖实体详情读取，拆分时必须采用显式依赖组合，避免 query/write 双向耦合回流。
- `buildRulesInjection` 是上下文装配关键入口，提取后若导出路径不可见会直接影响 Context Engine 组装链路。
- 拆分时禁止“复制旧逻辑并保留旧分支”形成双路径；`kgService.ts` 必须以单一路径委托为准。
- 子服务边界应以“职责清晰 + 最小接口”落地，避免过度抽象导致调试路径变长。

## 防治标签

- `MONOLITH` `ADDONLY` `OVERABS` `DUP` `FAKETEST`

## 不做什么

- 不新增实体/关系业务能力，不调整 `knowledge:*` IPC 通道命名与契约。
- 不修改 `KnowledgeEntity`、`KnowledgeRelation` 业务字段语义与持久化结构。
- 不处理 Sprint 2 范围内的 KG 功能增强（如上下文级别策略扩展、别名策略扩展）。

## 审阅状态

- Owner 审阅：`PENDING`
