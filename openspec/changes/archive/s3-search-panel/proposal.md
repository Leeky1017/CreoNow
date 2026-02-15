# 提案：s3-search-panel

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 3 将 `s3-search-panel`（AR-C33）定义为“搜索面板 UI（全文搜索 + 结果 + 跳转）”。当前搜索面板仅有骨架或缺乏完整交互闭环，无法支持用户快速定位并跳转命中文档片段。

## 变更内容

- 完善 Search Panel 查询输入、结果列表与命中项展示。
- 增加“点击结果跳转到目标文档/位置”的行为约束。
- 补齐空结果、加载中、错误态的可验证表现。

## 受影响模块

- Workbench（`apps/desktop/renderer/src/features/search/`）— 搜索面板交互与状态渲染。
- Workbench 跳转链路（编辑区联动）— 结果点击后的导航行为。

## 依赖关系

- 上游依赖：无（Sprint 3 依赖图中标记独立项）。
- 并行关系：可与 `s3-export`、`s3-i18n-extract` 并行执行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-search-panel` 定义；
  - `openspec/specs/workbench/spec.md` 中 Workbench 面板与导航行为约束。
- 核对项：
  - 变更范围限定在搜索面板 UI 与跳转闭环，不扩展检索引擎算法；
  - 跳转行为需复用现有编辑区导航契约，避免新增并行链路；
  - 需定义空态/错误态，防止“只显示列表”的伪完成。
- 结论：`NO_DRIFT`（范围与 AR-C33 一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 仅验证“有结果渲染”会导致伪绿，必须验证“点击结果后真实跳转”。
- 查询防抖与异步返回处理不当会出现旧结果覆盖新查询。
- 空态/错误态缺失会把失败伪装成“无结果”。

## 代码问题审计重点

- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 用例必须覆盖“输入查询→展示命中→点击跳转”全链路，不得只断言数组长度。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 增加错误路径断言（检索失败提示）与空结果断言，避免仅测 happy path。
- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：
  - Search Panel 状态与样式命名沿用 Workbench 既有模式，避免引入新范式。

## 防治标签

`FAKETEST` `DRIFT`

## 不做什么

- 不在本 change 内改造检索后端算法或索引结构。
- 不新增搜索历史、筛选器等路线图外功能。
- 不改动 IPC 通道命名与协议。

## 审阅状态

- Owner 审阅：`PENDING`
