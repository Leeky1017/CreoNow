# Proposal: issue-390-p3-integration-gate-closeout

## Why

`context-engine-p3`、`search-retrieval-p3`、`ai-service-p3` 已分别交付并归档（对应 #372/#373/#374），但当前需要一次跨模块全量集成门禁，验证三者在同一代码基线下的契约一致性、测试稳定性与交付收口证据。同时，当前分支存在 3 个非阻断 lint warning，需要清理到零 warning 以降低后续交付噪音。

## What Changes

- 执行完整里程碑门禁：`typecheck`、`lint`、`contract:check`、`cross-module:check`、`test:unit`、`test:integration`。
- 清理 3 个 React Hooks lint warning（`CommandPalette.stories.tsx`、`CommandPalette.tsx`、`ProxySection.tsx`）。
- 在 `openspec/_ops/task_runs/ISSUE-390.md` 记录关键命令、退出码与结论。
- 通过 PR + auto-merge 完成交付，并同步控制面 `main`。

## Impact

- Affected specs:
  - `openspec/specs/context-engine/spec.md`
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ai-service/spec.md`
- Affected code:
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.stories.tsx`
  - `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx`
  - `apps/desktop/renderer/src/features/settings/ProxySection.tsx`
  - `openspec/_ops/task_runs/ISSUE-390.md`
- Breaking change: NO
- User benefit: 在 P3 三模块完成后获得一份可复核、可追溯的全量集成验证与交付收口结果。
