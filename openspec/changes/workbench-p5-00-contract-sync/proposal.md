# 提案：workbench-p5-00-contract-sync

## 背景

P0–P4 迭代中，Workbench 主 Spec 与实际代码产生了三类漂移：
1. IPC 通道命名漂移：Spec 写 `project:switch`，实际契约为 `project:project:switch`（含 namespace 前缀）。
2. RightPanel Tab 类型漂移：Spec 仅定义 AI + Info 两个 tab，代码多了 `quality`（P4 Quality Gates 合理扩展）。
3. IconBar 项目列表漂移：Spec 定义 6 项（含 `media`），代码为 7 项（多了 `search`/`versionHistory`/`memory`，缺 `media`）。

不修正这些漂移，Phase B 的实现将基于错误的契约，导致返工。

## 变更内容

- [MODIFIED] Workbench Spec 中 IPC 通道名 `project:switch` → `project:project:switch`；`project:list:recent` → `project:project:list`（实际契约无 `list:recent`，最近项目通过 `project:project:list` 加排序实现）
- [ADDED] IconBar 列表新增 `search`（P2）、`versionHistory`（P3）、`memory`（P3）
- [DEFERRED] IconBar 列表中 `media` 标记为 V1 不交付（底层模块不存在）
- [MODIFIED] IconBar 最终顺序：files → search → outline → versionHistory → memory → characters → knowledgeGraph（顶部）；settings（底部固定）
- [ADDED] RightPanel Tab 类型新增 `quality`（P4 Quality Gates），`RightPanelType = "ai" | "info" | "quality"`
- [MODIFIED] `graph` → `knowledgeGraph`（与代码一致）

## 受影响模块

- Workbench — delta spec 修正 IPC 通道名、IconBar 列表、RightPanel Tab 类型
- Project Management — 引用的 IPC 通道名与 Workbench 保持一致（仅 Spec 文字）

## 依赖关系

- 上游依赖：无（本 change 为 Phase A，所有 P5 change 的基础）
- 下游依赖：workbench-p5-01 ~ 04 均依赖本 change 的 delta spec 结论

## 不做什么

- 不修改任何功能代码（仅 delta spec 文字对齐）
- 不调整 IPC 契约本身（代码层已统一为 `project:project:*`）
- 不实现 IconBar UI 变更（→ Change 01）
- 不实现 RightPanel 结构变更（→ Change 03）

## 审阅状态

- Owner 审阅：`PENDING`
