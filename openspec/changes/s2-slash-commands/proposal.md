# 提案：s2-slash-commands

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 2 Phase 3 将 `s2-slash-commands`（AR-C19）定义为写作命令集注册项，要求覆盖 `/续写 /描写 /对白 /角色 /大纲 /搜索`。
该 change 位于 `s2-slash-framework` 之后，职责是把命令清单与执行入口标准化，避免命令分散在 UI 组件中造成重复逻辑与回归噪声。

## 变更内容

- 定义 Slash 命令注册表契约，统一声明命令 id、展示名称、触发关键词与执行入口。
- 注册 Sprint 2 路线图要求的 6 个写作命令。
- 约束命令过滤与命中执行行为，保证面板选择后可稳定路由到对应命令处理器。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/editor/`）— Slash 命令数据模型、注册表与过滤/执行路由。
- AI Service（调用边界）— 仅作为命令执行目标接口，不在本 change 内扩展服务语义。

## 依赖关系

- 上游依赖：`s2-slash-framework`（Phase 3 依赖图明确 `s2-slash-framework -> s2-slash-commands`）。
- 下游依赖：无新增硬依赖；本 change 产出的命令注册表供 Slash 面板消费。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` Sprint 2 `s2-slash-commands` 条目；
  - `docs/plans/unified-roadmap.md` Phase 3 依赖图（依赖 C18）。
- 核对项：
  - 命令集合严格限定为路线图列出的 6 条，不增删语义范围；
  - 仅在既有 Slash 框架入口上接入注册表，不重复实现触发框架；
  - 依赖关系仅声明 `s2-slash-framework`，不虚构其他上游依赖。
- 结论：`NO_DRIFT`（与路线图一致；进入 Red 前需复核 C18 产物接口无漂移）。

## 踩坑提醒（防复发）

- 命令集合易在 UI 层硬编码，必须保持注册表单一来源，避免 `DUP`。
- 过滤测试不能只断言字符串包含，要覆盖“空查询返回全量、关键词返回子集”的行为。
- 执行路由应基于命令 id，而非展示文案，降低后续文案调整风险。

## 防治标签

`FAKETEST` `DUP` `DRIFT`

## 不做什么

- 不重写 Slash 触发框架或面板显隐逻辑（由 `s2-slash-framework` 负责）。
- 不新增路线图之外的 Slash 命令。
- 不在本 change 内引入 inline diff、快捷键系统或版本控制语义。

## 审阅状态

- Owner 审阅：`PENDING`
