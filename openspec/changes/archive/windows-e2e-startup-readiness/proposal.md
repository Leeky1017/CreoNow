# 提案：windows-e2e-startup-readiness

## 背景

PR #272 的 `windows-e2e` 任务在 2026-02-08 触发 18 个失败与 1 个 flaky。失败主因集中在两类：

- 多个 E2E 用例在「创建项目 → 进入编辑器」后 5 秒内找不到 `tiptap-editor`，表现为启动就绪竞态。
- `command-palette.spec.ts` 在复用同一页面执行多用例时出现弹窗残留，导致搜索输入框偶发不可用。

## 变更内容

- 在 `project-management` delta spec 中明确「创建项目后的编辑器就绪」可观察条件，并要求 E2E 使用条件等待，不使用固定 sleep。
- 在 `workbench` delta spec 中明确命令面板命令执行后的弹窗焦点与面板关闭时序，并要求快捷键用例之间无残留弹窗状态。
- 通过 TDD 修复 Windows E2E 稳定性：先记录 Red 失败证据，再以最小改动引入共享等待 helper 与命令面板测试隔离。

## 受影响模块

- OpenSpec:
  - `openspec/changes/windows-e2e-startup-readiness/**`
- E2E 测试：
  - `apps/desktop/tests/e2e/**/*.spec.ts`（仅涉及创建项目后编辑器就绪路径）
  - `apps/desktop/tests/e2e/command-palette.spec.ts`
  - `apps/desktop/tests/e2e/_helpers/*.ts`（新增共享 helper）
- 运行证据：
  - `openspec/_ops/task_runs/ISSUE-273.md`

## 不做什么

- 不修改主 spec：`openspec/specs/**`。
- 不改变业务功能语义（项目创建、命令面板功能本身不扩展）。
- 不在本 change 中引入新技术栈或跨模块架构重写。

## 审阅状态

- Owner 审阅：`APPROVED`
- Apply 状态：`DONE`（PR #274 已合并；change 已归档）
