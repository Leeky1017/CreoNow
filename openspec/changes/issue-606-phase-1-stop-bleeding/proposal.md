# 提案：issue-606-phase-1-stop-bleeding

更新时间：2026-02-22 11:36

## 背景

CN 前端已具备 Design Token 与 Primitives 基础，但执行层存在系统性逃逸：约 24 个文件存在 raw color，业务层硬编码 `z-10/z-30/z-50`，并混用魔法阴影与散写原生 `<button>/<input>`。这些问题已在 Notion 原文中被归纳为 Phase 1「止血」的首要治理对象。

若不先完成止血，后续 AppShell 拆分、交互动效与视觉精磨会在不稳定基线上叠加风险，持续产生主题不一致、Z 轴穿透和可访问性退化。

## 变更内容

- 以「Phase」组织 issue-606 的前端治理范围，而不是按子页面数量分拆。
- 明确 Phase 1 目标为三项主线：Token 清扫、原生元素替换、Z-index 统一。
- 在 Workbench delta spec 落地 5 个场景，覆盖 raw color 禁止、z-index token 化、原生 `button/input` 替换为 Primitives、阴影 token 化。
- 为后续实现阶段预置 TDD 映射与门禁口径，避免 Phase 2/3 范围提前混入。

## 受影响模块

- `workbench` — 前端壳层与 Feature 层样式/交互契约。

## 不做什么

- 不在本阶段引入 AppShell 拆分与 Workbench Shell 结构重构（Phase 2）。
- 不在本阶段引入 ScrollArea/Typography 全量建设与动效体系收敛（Phase 3）。
- 不在本阶段执行逐屏参考对标与最终视觉精磨（Phase 4）。

## 依赖关系

- 上游依赖：
  - `openspec/specs/workbench/spec.md`（当前主规范基线）
  - `openspec/changes/issue-604-windows-frameless-titlebar`（同模块活跃变更，需避免语义冲突）
- 下游依赖：
  - issue-606 后续 Phase 2/3/4 实施变更（待分别建档）

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `openspec/specs/workbench/spec.md`
  - `openspec/changes/issue-604-windows-frameless-titlebar/specs/workbench/spec.md`
  - `/tmp/cn_notion_vault/CN前端开发/CN 前端开发.md`
  - `/tmp/cn_notion_vault/CN前端开发/CN 前端开发/Design Token 系统.md`
  - `/tmp/cn_notion_vault/CN前端开发/CN 前端开发/视觉审计（Visual Audit）.md`
  - `/tmp/cn_notion_vault/CN前端开发/CN 前端开发/组件架构（Component Architecture）.md`
- 核对项：
  - Phase 1 仅保留“止血”范围，不提前引入 Phase 2/3/4 动作。
  - 与 issue-604 的 Windows 标题栏场景不冲突，不覆盖其窗口控制语义。
  - “Token 清扫 + 原生元素替换 + Z-index 统一”与 Notion 原文结论一致。
- 结论：`NO_DRIFT`

## 来源映射

| 来源文档                                | 原文核心结论                                             | 本 change 映射                                                 |
| --------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `CN 前端开发.md`                        | Phase 1 定义为“Token 清扫 + 原生元素替换 + 统一 Z-Index” | proposal 范围定义 + `specs/workbench/spec.md` 三个 Requirement |
| `Design Token 系统.md`                  | raw color、z-index、魔法阴影属于执行层逃逸               | `WB-P1-S1`、`WB-P1-S2`、`WB-P1-S4`                             |
| `视觉审计（Visual Audit）.md`           | Z 轴穿透与主题逃逸是高优先级风险                         | `WB-P1-S2`、`WB-P1-S3` + tasks 门禁要求                        |
| `组件架构（Component Architecture）.md` | Primitives 基础完备，问题在业务层绕过原生元素散写        | `WB-P1-S5`                                                     |

## 审阅状态

- Owner 审阅：`PENDING`
