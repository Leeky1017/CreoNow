# 提案：s1-break-panel-cycle

## 背景

基于 `docs/plans/unified-roadmap.md` 的 Sprint 1 change `s1-break-panel-cycle`（A5-H-001），当前存在如下循环依赖：

- `RightPanel.tsx` 引入 `AiPanel`
- `AiPanel.tsx` 又从 `RightPanel.tsx` 引入 `useOpenSettings`

该循环会放大渲染层耦合，增加模块边界漂移风险，也会提高后续 RightPanel/AiPanel 变更冲突概率。

## 变更内容

- 新建 `apps/desktop/renderer/src/contexts/OpenSettingsContext.ts`，承接 `OpenSettingsContext` 与 `useOpenSettings`。
- `RightPanel.tsx` 删除本地 context/hook 定义，改为从 `../../contexts/OpenSettingsContext` 引入。
- `RightPanel.tsx` 保留 `export { useOpenSettings }` 临时向后兼容导出，避免现有消费方一次性断裂。
- `AiPanel.tsx` 将 `useOpenSettings` import 源切换到 `../../contexts/OpenSettingsContext`，解除 `RightPanel` ↔ `AiPanel` 环。

## 受影响模块

- Workbench（Renderer 布局层）— `apps/desktop/renderer/src/components/layout/RightPanel.tsx`
- Workbench（Renderer AI 面板）— `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
- Workbench（Renderer 共享上下文）— `apps/desktop/renderer/src/contexts/OpenSettingsContext.ts`（新增）

## 依赖关系

- 上游依赖：无（`unified-roadmap` 中 Sprint 1 Wave 1 独立项）。
- 横向协同：与其他触碰 `RightPanel.tsx` / `AiPanel.tsx` 的并行 change 需做同文件冲突规避，但无语义级强依赖。
- 下游依赖：`s2-write-button`、`s2-bubble-ai` 建议在本 change 之后推进（按 `unified-roadmap` 依赖提示）。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s1-break-panel-cycle` 定义；
  - `openspec/specs/workbench/spec.md` 中右侧面板行为契约；
  - 当前代码中 `useOpenSettings` 的定义与消费链路（`RightPanel.tsx` / `AiPanel.tsx` / 相关测试）。
- 核对项：
  - 提取后 `openSettings` 回调语义保持不变（提供值时透传，缺失时安全 no-op）。
  - `AiPanel` 不再从 `RightPanel` 引入 `useOpenSettings`。
  - 保留 `RightPanel` 的兼容导出以承接现有消费方迁移窗口。
- 结论：`NO_DRIFT`（与 Sprint 1 变更目标一致，可进入 TDD）。

## 踩坑提醒（防复发）

- 提取前先确认 `useOpenSettings` 是否隐式依赖 `RightPanel` 内部状态；若有隐藏依赖，必须先显式参数化再迁移。
- 该变更属于“提取 + 删除”而非“复制 + 保留”，避免 `ADDONLY` 反模式导致双份 context 并存。
- `AiPanel` 相关测试存在 `vi.mock("../../components/layout/RightPanel")` 习惯写法；迁移时需同步校准 mock 入口或保留兼容导出。

## 防治标签

- `MONOLITH` `ADDONLY`

## 不做什么

- 不调整 RightPanel 标签定义、布局尺寸与交互行为。
- 不修改 AI 业务逻辑、流式对话链路与 IPC 协议。
- 不处理与本 change 无关的其他循环依赖（例如 context-engine 侧循环问题）。

## 审阅状态

- Owner 审阅：`PENDING`
