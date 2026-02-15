# 提案：s3-zen-mode

## 背景

`docs/plans/unified-roadmap.md` 在 Sprint 3 将 `s3-zen-mode`（AR-C35）定义为“禅模式（全屏编辑器，隐藏侧边栏）”。当前编辑器缺少稳定的沉浸式切换闭环，用户在专注写作场景下仍受侧边栏和面板干扰。

## 变更内容

- 增加禅模式开关行为：进入后隐藏侧边栏/面板，突出主编辑区。
- 增加退出禅模式后的布局恢复约束，确保不丢失用户原始布局状态。
- 补齐键盘触发与状态一致性验证。

## 受影响模块

- Editor（`apps/desktop/renderer/src/features/zen-mode/`）— 禅模式状态与渲染。
- Workbench 布局联动（`layout store`）— 侧边栏/面板显隐与恢复。

## 依赖关系

- 上游依赖：无（Sprint 3 依赖图中标记独立项）。
- 并行关系：可与 `s3-search-panel`、`s3-export` 并行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-zen-mode` 定义；
  - `openspec/specs/editor/spec.md` 与 `openspec/specs/workbench/spec.md` 布局/快捷键约束。
- 核对项：
  - 禅模式范围仅限布局显隐与编辑专注，不扩展编辑器格式能力；
  - 进入/退出需与既有布局状态管理兼容；
  - 快捷键行为需与现有编辑器快捷键体系无冲突。
- 结论：`NO_DRIFT`（与 AR-C35 一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 仅切 CSS class 而不改布局状态会导致退出后状态错乱。
- 若不保存进入前布局快照，退出禅模式后难以恢复用户原配置。
- 快捷键切换需防抖，避免一次按键触发双重切换。

## 代码问题审计重点

- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 测试必须覆盖“进入禅模式 + 退出后恢复”的双向行为，不得只测进入态。
- 来自 `docs/代码问题/虚假测试覆盖率.md`：
  - 增加快捷键路径与状态同步断言，避免仅做组件快照测试。
- 来自 `docs/代码问题/风格漂移与项目约定偏离.md`：
  - 禅模式状态管理复用既有 layout store 模式，避免另起平行状态系统。

## 防治标签

`FAKETEST` `DRIFT`

## 不做什么

- 不新增路线图外视觉主题或字体系统。
- 不改动 Editor 功能菜单与内容模型。
- 不引入新的 IPC 通道。

## 审阅状态

- Owner 审阅：`PENDING`
