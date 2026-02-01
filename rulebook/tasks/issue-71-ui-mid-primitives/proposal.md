# Proposal: issue-71-ui-mid-primitives

## Why

Renderer 的多个中复杂度面板仍使用大量内联样式，导致样式复用困难、偏离设计系统，
并且交互态（focus-visible/键盘可用性）容易不一致，长期会放大维护与迭代成本。

## What Changes

- 将以下组件从内联样式迁移到 primitives + Tailwind classes：
  - `SettingsPanel`
  - `ProxySection`
  - `CreateProjectDialog`
  - `CommandPalette`
  - `SearchPanel`
  - `ContextViewer`
  - `AnalyticsPage`
- 保持关键路径 `data-testid` 稳定以保证 Windows Playwright Electron E2E 不回归。
- 修复交互语义：
  - `ListItem`（interactive）支持 Enter/Space 触发
  - `CreateProjectDialog` submit 采用标准 `form` 提交绑定（移除不安全的 event cast）
  - `SearchPanel` 搜索结果使用 `button` 渲染以获得天然键盘/焦点行为

## Impact

- Affected specs: creonow-v1-workbench
- Affected code:
  - `apps/desktop/renderer/src/features/settings/SettingsPanel.tsx`
  - `apps/desktop/renderer/src/features/settings/ProxySection.tsx`
  - `apps/desktop/renderer/src/features/projects/CreateProjectDialog.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/renderer/src/features/search/SearchPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/ContextViewer.tsx`
  - `apps/desktop/renderer/src/features/analytics/AnalyticsPage.tsx`
  - `apps/desktop/renderer/src/components/primitives/ListItem.tsx`
- Breaking change: NO
- User benefit: 更一致的设计系统样式、更好的键盘可用性、更可维护的 UI 代码
