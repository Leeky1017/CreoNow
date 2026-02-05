# Design 00 — Overview（组装总览）

> Spec: `../spec.md`

本设计文档解释：如何把“现有前端资产”组装成可完整使用的 App Surface，并且保证验收可执行、可追溯。

## 关键结论（本规范的硬口径）

1. **SSOT 是当前前端资产**：`apps/desktop/renderer/src/**` + Storybook（`*.stories.tsx`）。  
   - 任何实现决策都不得“回退到旧原型”重做。
2. **零孤儿资产**：Storybook Inventory 的 57 个条目都必须有去处：  
   - 要么在 App 中可达并可操作；  
   - 要么作为 QA Surface（允许隐藏入口/开发者模式），但仍需可达与可验收。
3. **一条链路一套实现**：同一能力（Settings/Export/Confirm/Zen/Version Compare 等）必须收敛到单一路径；禁止双栈并存。
4. **验证不是“代码能跑”**：必须有自动化（E2E/单测）+ Storybook WSL-IP 视觉/交互验收，并留下证据。

## 现状诊断（为什么还不是完全体）

当前应用已经具备 AppShell 与主流程（Onboarding → Dashboard → Editor），但仍存在以下典型“未组装”症状：

- **面板是真 UI，但数据/动作是假**：例如 Outline/VersionHistory/Characters/Quality 面板存在，但仍用空数组/占位动作。
- **Storybook-only 的成熟资产**：SettingsDialog、ExportDialog、AiDialogs、ZenMode、KnowledgeGraph（可视化）等尚未接入真实 App Surface。
- **关键交互留有 TODO / console.log / silent catch**：这会导致“看起来能点，其实没完成闭环”。

这些不是“缺组件”，而是“缺组装与闭环”。

## 组装策略（推荐）

### Strategy A（推荐）：Surface Registry + 单一路径收敛

做法：

- 建立一个“Surface Registry（表）”：列出所有可达 surface（页面/面板/对话框/覆盖层），并规定入口（IconBar/CommandPalette/快捷键）。
- 对每个 Storybook 资产：
  - 指定它在 Registry 中的归属；  
  - 明确当前状态（已可用/半可用/孤儿）；  
  - 在任务卡中给出“补齐到可验收”的动作与测试。

优点：

- 资产不丢、入口一致、可测；
- 便于避免“两个 Settings/两个 Export/多个 Confirm”。

代价：

- 需要一次“全量梳理 + 收敛重构”的工程化投入（但这是“完全体”必须付出的成本）。

### Strategy B（不推荐）：逐点修补

做法：看到哪里 TODO 就补哪里，不做全局映射与收敛。

缺点：

- 很容易漏资产（出现孤儿）；
- 很容易积累双栈；
- 验收难以形成门禁，长期返工。

## 设计产物清单（本 spec 内）

- 资产清单与映射：`design/01-asset-inventory-and-surface-map.md`
- 入口与 Surface Registry 设计：`design/02-navigation-and-surface-registry.md`
- IPC 预留与收敛方案：`design/03-ipc-reservations.md`
- QA 门禁（含 WSL-IP Storybook）：`design/04-qa-gates-storybook-wsl.md`

