# Workbench Delta Summary — issue-568-s3-i18n-extract

## Scenario Mapping

- `S3-I18N-EXTRACT-S1`：renderer 可见文案从硬编码迁移为 `t("workbench.*")` 渲染链路。
- `S3-I18N-EXTRACT-S2`：`zh-CN` 与 `en` locale 键集保持一致。
- `S3-I18N-EXTRACT-S3`：新增 key 使用统一命名空间并建立重复语义防线。

## Delivery Scope

- In scope:
  - `apps/desktop/renderer/src/features/commandPalette/**`
  - `apps/desktop/renderer/src/components/layout/{StatusBar.tsx,SaveIndicator.tsx,AppShell.tsx}`
  - `apps/desktop/renderer/src/features/rightpanel/InfoPanel.tsx`
  - `apps/desktop/renderer/src/i18n/locales/{zh-CN.json,en.json}`
  - `apps/desktop/renderer/src/features/__tests__/i18n-text-extract.test.tsx`
  - `apps/desktop/renderer/src/i18n/__tests__/{locale-parity.test.ts,locale-duplication-guard.test.ts}`

- Out of scope:
  - i18n 初始化机制改造（由 `s3-i18n-setup` 提供）
  - 语言切换功能与用户偏好 UI
  - 非 Workbench 的主进程/IPC 行为变更
