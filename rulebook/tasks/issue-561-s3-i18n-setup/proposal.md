# Proposal: issue-561-s3-i18n-setup

## Why

Sprint 3 的 `s3-i18n-setup` 需要为 Workbench 建立可复用 i18n 初始化基线，避免后续 `s3-i18n-extract` 在无统一入口情况下进行大规模文案替换，产生高回归风险。

## What Changes

- 新增 renderer i18n 初始化入口（`renderer/src/i18n/index.ts`）。
- 新增 `zh-CN` 与 `en` locale skeleton，并定义最小 key 集。
- 在 Workbench 启动链路接入 i18n provider。
- 将 App shell 的一个基础文案入口切换为 key 驱动渲染路径。
- 通过 S1/S2/S3 聚焦测试完成 Red → Green 证据闭环。

## Impact

- Affected specs:
  - `openspec/changes/s3-i18n-setup/specs/workbench-delta.md`
- Affected code:
  - `apps/desktop/renderer/src/i18n/**`
  - `apps/desktop/renderer/src/main.tsx`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
- Breaking change: NO
- User benefit:
  - 提供稳定 i18n 初始化基线，支持后续批量文案抽取并降低回归风险。
