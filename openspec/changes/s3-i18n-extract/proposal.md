# 提案：s3-i18n-extract

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 3 将 `s3-i18n-extract`（AR-C32）定义为“硬编码中文 → locale keys 抽取”项。若继续保留 renderer 中分散硬编码文案，将阻塞多语言扩展与统一文案治理，同时增加 UI 回归成本。

## 变更内容

- 将 renderer 范围内硬编码中文文案替换为 `t('key')` 调用。
- 同步补全 `zh-CN.json` 与 `en.json` 的 key-value 资源。
- 建立 key 去重与命名约束，避免抽取过程中形成重复语义 key。

## 受影响模块

- Workbench（`apps/desktop/renderer/src/features/**`）— UI 文案渲染改为 key 驱动。
- i18n locale 文件（`apps/desktop/renderer/src/i18n/locales/*.json`）— 多语言资源落盘。

## 依赖关系

- 上游依赖：`s3-i18n-setup`（提供 i18n 初始化、默认/回退语言与 locale 骨架）。
- 并行关系：可与 `s3-search-panel`、`s3-export` 并行，但必须先完成 `s3-i18n-setup` 的依赖同步检查。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-i18n-setup` → `s3-i18n-extract` 依赖关系；
  - `openspec/changes/s3-i18n-setup/` 中初始化与 locale 骨架约束；
  - `openspec/specs/workbench/spec.md` 当前 Workbench 文案与交互约束。
- 核对项：
  - `s3-i18n-setup` 已提供可用 i18n 装配点与基础资源结构；
  - 抽取范围限定在 renderer 文案替换，不扩展功能行为；
  - key 命名规范与命名空间策略已明确，可避免重复链路。
- 结论：`NO_DRIFT`（依赖满足，可进入 TDD）。

## 踩坑提醒（防复发）

- 批量替换文案时容易引入“同义不同 key”，后续维护成本陡增。
- 若只替换 UI 字符串而未同步 locale 文件，会出现运行时 key 漏洞。
- 不应通过大量解释性注释描述“原文→翻译”，避免噪音堆积。

## 代码问题审计重点

- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：
  - 统一 key 命名与命名空间规则，禁止跨文件出现风格漂移（驼峰/下划线混用）。
- 来自 `docs/代码问题/重复链路与冗余逻辑.md`：
  - 新增 key 前先检索既有 locale，防止同义 key 重复定义与分叉维护。
- 来自 `docs/代码问题/注释泛滥与噪音代码.md`：
  - 禁止在组件内引入逐行翻译注释；文案语义以 locale 文件为单一事实来源。

## 防治标签

`DRIFT` `DUP` `NOISE`

## 不做什么

- 不新增新的业务功能或交互流程。
- 不改动 i18n 初始化机制（由 `s3-i18n-setup` 定义）。
- 不触碰主进程服务与 IPC 契约。

## 审阅状态

- Owner 审阅：`PENDING`
