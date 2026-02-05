# P0-001: Surface Registry + 零孤儿门禁（57/57 覆盖）

Status: todo

## Goal

建立一个“Surface Registry（组装注册表）”，把 Storybook Inventory（57 个 meta.title）与真实 App/QA 入口一一对应起来，并加入自动化门禁，确保后续不会出现“storybook-only 孤儿资产”。

## Dependencies

- Spec: `../spec.md#cnfa-req-001`
- Spec: `../spec.md#cnfa-req-002`
- Design: `../design/01-asset-inventory-and-surface-map.md`
- Design: `../design/02-navigation-and-surface-registry.md`
- Design: `../design/04-qa-gates-storybook-wsl.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/surfaces/surfaceRegistry.ts`（注册表：surface ↔ storybookTitle ↔ entrypoints） |
| Add | `apps/desktop/renderer/src/surfaces/openSurface.ts`（统一 open/close 的动作入口，避免散落） |
| Add | `apps/desktop/tests/unit/storybook-inventory.spec.ts`（读取 `*.stories.tsx` 提取 meta.title，与 registry 对齐） |
| Update | `openspec/specs/creonow-frontend-full-assembly/design/01-asset-inventory-and-surface-map.md`（把实现后的入口细节与 testid 回填） |

> 说明：测试不得依赖 shell 命令解析；建议直接用 Node `fs` 递归读取 `apps/desktop/renderer/src/**.stories.tsx` 并用可靠的正则提取 `title: "..."`（以现有仓库约束为准）。

## Acceptance Criteria

- [ ] `surfaceRegistry` 覆盖 57/57 个 story（以 `design/01-asset-inventory-and-surface-map.md` 为准）：
  - [ ] 每个条目都有 `storybookTitle`
  - [ ] 每个条目都有明确入口（App/QA/Storybook）与 `data-testid`
- [ ] 自动化门禁：
  - [ ] 单测能读取并统计 story titles（必须断言数量与集合一致）
  - [ ] 若新增/删除 stories 未更新 registry，测试必须失败（阻止合并）
- [ ] “一条链路一套实现”被写入 registry 结构（同一能力不会出现重复 surfaceId/入口）

## Tests

- [ ] Unit: `storybook-inventory.spec.ts`
  - [ ] 断言提取到的 titles 与 registry 的 titles 集合完全一致（无缺失、无多余）
  - [ ] 断言 categories（Features/Layout/Primitives）都有覆盖

## Edge cases & Failure modes

- Story 文件内出现非 meta 的 `title:` 字段：提取逻辑必须只匹配 Storybook meta.title（建议匹配 `title: "(Primitives|Layout|Features)/"` 前缀，避免误抓业务数据）
- Registry 条目重复/冲突：必须在测试中检测（例如同一 story title 多次出现）

## Observability

- 失败时测试输出必须可定位：显示缺失/多余的 titles 列表（避免“红了但不知道为什么”）

## Manual QA (Storybook WSL-IP)

- [ ] 本任务完成后，用 WSL-IP 打开 Storybook，随机抽查至少 3 个 stories，确认 assets 能正常渲染（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

