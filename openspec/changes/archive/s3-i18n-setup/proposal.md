# 提案：s3-i18n-setup

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 3 将 `s3-i18n-setup`（AR-C31）定义为 i18n 基础设施落地项：建立 `react-i18next` 初始化与 locale 目录骨架，为后续文案抽取提供稳定入口。当前 renderer 仍以硬编码文案为主，缺少统一语言资源装配点，导致后续批量替换风险高、回归面大。

## 变更内容

- 新增 i18n 初始化入口（`renderer/src/i18n/index.ts`）并接入 Workbench 应用启动链路。
- 新增 locale 资源骨架（`zh-CN`、`en`），定义最小可运行命名空间。
- 约束默认语言、回退语言与缺失 key 行为，确保后续 `s3-i18n-extract` 可在稳定基线上执行。

## 受影响模块

- Workbench（`apps/desktop/renderer/src/` 应用入口与外壳）— i18n provider 装配。
- i18n 基础设施（`apps/desktop/renderer/src/i18n/`）— 初始化与 locale 文件结构。

## 依赖关系

- 上游依赖：无（在 Sprint 3 依赖图中作为独立起步项）。
- 下游依赖：`s3-i18n-extract` 依赖本 change 提供的初始化与 locale 骨架。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-i18n-setup` 条目与 Sprint 3 依赖图；
  - `openspec/specs/workbench/spec.md` 中 Workbench 启动与 UI 装配约束。
- 核对项：
  - Scope 仅覆盖 i18n 初始化与 locale 骨架，不提前进行全量文案抽取；
  - 下游 `s3-i18n-extract` 所需的默认语言、回退语言、命名空间入口在本 change 提供；
  - 不引入路线图外的新语言切换 UI。
- 结论：`NO_DRIFT`（与 AR-C31 定义一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 初始化阶段若混入业务文案替换，容易与 `s3-i18n-extract` 形成交叉改动，导致漂移。
- locale 骨架若未统一命名空间前缀，后续抽取会出现 key 冲突与重复。
- 缺失 key 处理不能走静默空串兜底，需保持可发现性。

## 代码问题审计重点

- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：
  - 约束 i18n key 命名为统一命名空间（例如 `workbench.*`），禁止同义多命名风格并存。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 测试必须覆盖“缺失 key/回退语言”路径，禁止只断言“渲染不报错”。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 增加 locale 结构一致性断言（`zh-CN` 与 `en` 键集对齐），防止表面通过但运行时丢文案。

## 防治标签

`DRIFT` `FAKETEST`

## 不做什么

- 不在本 change 内完成 renderer 全量文案抽取（由 `s3-i18n-extract` 负责）。
- 不新增语言切换设置页或用户级语言偏好持久化。
- 不改动主进程 IPC 或后端服务。

## 审阅状态

- Owner 审阅：`PENDING`
