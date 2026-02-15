# Proposal: issue-568-s3-i18n-extract

## Why

Sprint 3 的 `s3-i18n-extract` 负责把 Workbench renderer 中残留的硬编码中文文案迁移到 locale key，避免后续多语言扩展继续叠加重复字符串与语义分叉。

## What Changes

- 新增 S3-I18N-EXTRACT 对应的三条测试（S1/S2/S3），先 Red 再 Green。
- 将 Workbench 关键可见文案改为 `t("workbench.*")` 渲染路径：
  - `CommandPalette`（搜索占位、空态、footer 提示、分组标题）
  - `StatusBar` / `SaveIndicator`
  - `InfoPanel`（版本历史入口）
- 统一 `AppShell` 命令分组为稳定 id（`command/file/recent`），由 locale 控制展示文案。
- 对齐 `zh-CN.json` 与 `en.json` 键集，并补齐命名空间 `workbench.commandPalette/statusBar/saveIndicator/infoPanel`。

## Impact

- Affected specs:
  - `openspec/changes/s3-i18n-extract/specs/workbench-delta.md`
- Affected code:
  - `apps/desktop/renderer/src/features/commandPalette/**`
  - `apps/desktop/renderer/src/components/layout/{StatusBar.tsx,SaveIndicator.tsx,AppShell.tsx}`
  - `apps/desktop/renderer/src/features/rightpanel/InfoPanel.tsx`
  - `apps/desktop/renderer/src/i18n/locales/{zh-CN.json,en.json}`
  - `apps/desktop/renderer/src/i18n/__tests__/**`
- Breaking change: NO
- User benefit:
  - Workbench 文案进入统一 key 治理，降低后续多语言与文案维护成本，减少重复语义 key 漂移风险。
