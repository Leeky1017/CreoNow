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

## Visual Evidence

<!-- 前端改动必须附带以下至少一项 -->
<!-- 不涉及前端的改动写"N/A" -->

- [ ] Storybook 截图
- [ ] 本地运行截图
- [ ] Storybook CI Artifact 链接
- [ ] N/A（非前端改动）

## Test Coverage

<!-- 说明新增/修改了哪些测试，测试覆盖了什么回归场景 -->

-

## Risk & Rollback

<!-- 本次改动最可能出什么问题？如何回滚？ -->

-

## Checklist

- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] 相关测试通过
- [ ] 前端改动：`pnpm -C apps/desktop storybook:build` 通过
- [ ] 无硬编码颜色/间距值（使用 Design Token）
- [ ] 无 `any` 类型
- [ ] 新组件有 Storybook Story
