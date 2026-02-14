# 提案：s2-settings-disable

## 背景

`docs/plans/unified-roadmap.md` 将 `s2-settings-disable` 定义为 Sprint 2 债务修复项（A1-H-001）。Settings 对话框中账户相关入口尚未具备可交付后端能力，若继续可点击会造成“可见但不可用”的行为偏差。

## 变更内容

- 将未落地的账户入口（如升级/删除账户）显式置为禁用状态。
- 为禁用入口补充“即将推出”提示，减少误导点击。
- 明确禁用态下不得触发对应业务回调。

## 受影响模块

- Workbench（Settings Dialog）— `apps/desktop/renderer/src/features/settings-dialog/SettingsDialog.tsx`

## 依赖关系

- 上游依赖：无（Sprint 2 债务组默认独立并行）。
- 横向协同：与设置页其它功能改动可并行。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s2-settings-disable` 条目；
  - `openspec/specs/workbench/spec.md` 的设置与交互可达性约束。
- 核对项：
  - 账户入口禁用态可见且可测试；
  - 禁用态不会触发未实现行为；
  - 仅做下线防漂移，不扩展账户功能。
- 结论：`NO_DRIFT`。

## 踩坑提醒（防复发）

- 禁用按钮时必须同时阻断事件触发，避免“视觉禁用但逻辑可触发”。

## 防治标签

- `ADDONLY` `DRIFT`

## 不做什么

- 不实现账户升级、删除等后端流程。
- 不改设置页导航结构与视觉体系。
- 不修改主 spec 正文（仅起草 change 三件套）。

## 审阅状态

- Owner 审阅：`PENDING`
