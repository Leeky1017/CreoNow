# Proposal: issue-179-frontend-full-assembly-audit-d1c925

## Why

CreoNow 前端当前已经拥有较完整的组件/页面资产与 Storybook 覆盖，但仍存在典型“未组装成完全体”的问题：

- 资产分散在 Storybook 与 App 内部，部分仍是 Storybook-only（入口缺失）
- App 中一些面板仍处于占位状态（空数组/console.log/TODO），按钮“看起来能点但不闭环”
- 验收门禁若缺少标准化证据格式与清单，容易执行走样（“看一眼就过”）

同时，审计报告（`/home/leeky/.windsurf/plans/creonow-frontend-assembly-planning-assessment-d1c925.md`）指出：现有规范虽然方向正确，但缺少逐项补齐清单、任务卡细化、证据格式、并行冲突矩阵等“可执行细节”，会导致实施阶段返工与遗漏。

## What Changes

本变更为“Spec-first 的规划补齐”，不实现功能代码，只补齐规范资产：

- 修正并固化 **Storybook Inventory SSOT**（截至 2026-02-05：56/56）
- 增补 4 份关键设计文档：
  - Design 06：逐项补齐清单（字段/交互/IPC/测试/PR 粒度）
  - Design 07：IPC 接口规范（request/response/errors/timeout/cancel + 任务映射）
  - Design 08：测试与 QA 矩阵（自动化 + Storybook WSL-IP 手工 + 证据格式）
  - Design 09：并行执行与冲突矩阵（分期 + 高冲突文件约束）
- 将 14 个 P0 任务卡补齐为“可直接执行”的粒度：
  - 明确资产范围、子任务拆分、PR 粒度建议、冲突提示、RUN_LOG 留证口径

## Impact

- Affected specs:
  - `openspec/specs/creonow-frontend-full-assembly/spec.md`
  - `openspec/specs/creonow-frontend-full-assembly/design/*.md`
  - `openspec/specs/creonow-frontend-full-assembly/task_cards/**/*.md`
- Affected code: NO（本任务不修改 app 运行时逻辑）
- Breaking change: NO
- User benefit:
  - 让“前端完全体组装”从“方向正确”升级为“执行可落地”：不漏资产、不双栈、验收可追溯、并行可控
