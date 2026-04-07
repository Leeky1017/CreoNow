## Summary

<!-- 一句话总结本 PR 做了什么 -->

Closes #<!-- Issue 编号 -->

## Change Type

- [ ] Feature（新功能）
- [ ] Fix（修复）
- [ ] Docs（文档）
- [ ] Refactor（重构）
- [ ] Test（测试）
- [ ] CI/Infra（工程）

## Impact Scope

<!-- 列出受影响的模块/层/文件范围 -->

-

## Validation Evidence

<!-- 粘贴关键验证命令、CI 结果或门禁摘要 -->

-

## Visual Evidence

<!-- 前端改动必须在本节直接嵌入至少 1 张截图；仅写“本地有截图 / 之后补”视为未完成 -->
<!-- 不涉及前端的改动写 N/A -->

### Embedded Screenshots

<!-- 直接把截图粘贴到此处，确保 reviewer 打开 PR 即可见 -->

N/A

### Storybook Artifact / Link

<!-- 前端改动填写可点击链接；非前端改动写 N/A -->

- Link:
- Visual acceptance note:

- [ ] N/A（非前端改动）

## Test Coverage

<!-- 说明新增/修改了哪些测试，测试覆盖了什么回归场景 -->

-

## Risk & Rollback

<!-- 本次改动最可能出什么问题？如何回滚？ -->

-

## Audit Gate

<!-- 只有达到可交审条件后才请求审计 -->

- `scripts/agent_pr_preflight.sh`:
- Required checks:

## Checklist

- [ ] 本 PR 在 `.worktrees/issue-<N>-<slug>` 中完成实现、提 PR、修 CI、回应审计
- [ ] PR 正文包含 `Closes #N`、验证证据、回滚点、审计门禁
- [ ] `scripts/agent_pr_preflight.sh` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] 相关测试通过
- [ ] required checks 全绿后才请求审计/合并
- [ ] 前端改动：`pnpm -C apps/desktop storybook:build` 通过
- [ ] 前端改动：PR 正文已直接嵌入至少 1 张截图；无可见视觉证据视为未完成
- [ ] 前端改动：已提供可点击的 Storybook Artifact / Link 与视觉验收说明
- [ ] 无硬编码颜色/间距值（使用 Design Token）
- [ ] 无 `any` 类型
- [ ] 新组件有 Storybook Story
