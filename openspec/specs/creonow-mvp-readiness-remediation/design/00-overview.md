# Design 00 — Overview（审评报告执行化：设计决策总览）

> Spec: `../spec.md`

本目录的定位：把审评报告里“隐含的决策”全部显式化，避免执行阶段出现：

- 同一个问题两套实现（违反“一条链路一套实现”）
- 需求/验收口径不一致（导致“做了但没法验收”）
- 并行改同一高冲突文件（导致 rebase 地狱）

## 1) 这份 spec 的使用方式（执行者必读）

执行顺序以 `task_cards/index.md` 为准：

1. P0：先把 MVP 阻塞与 P0 小修全部闭环（含测试/CI）
2. P1：再做质量/安全/架构加固
3. P2：最后做性能与代码质量债

每张任务卡都必须包含：

- Expected File Changes（写死要改哪些文件）
- Acceptance Criteria（可勾选的验收条款）
- Tests（写死命令与必须新增/更新的用例）
- Edge cases（边界条件不能漏）
- Observability（关键日志/错误码/落盘证据）
- Conflict Notes（高冲突文件串行约束）

## 2) 审评报告到任务卡的映射

见 `design/01-delta-map.md`：把报告 todos（以及关键代码指针）映射到本 spec 的 P0/P1/P2 任务卡，避免“看报告的人”和“干活的人”理解不一致。

## 3) 关键 UX 决策（避免实现漂移）

- Dashboard 项目操作：rename 用输入对话框；duplicate/archive 用确认对话框；archive 必须可恢复（不能变相 delete）。
- Version History Preview：实现为只读预览 Dialog（展示 `version:read` 的真实内容，不触发写入）。
- Restore：所有入口统一先确认（SystemDialog），确认文案与按钮标签写死（见 `design/03-version-preview-and-restore-confirm.md`）。
- ErrorBoundary：必须可恢复（Reload / Back to Dashboard 至少其一，见 `design/04-error-boundary-and-crash-recovery.md`）。

## 4) 关键工程决策（避免执行卡住）

- IPC contract + codegen：同一时间只能 1 个 PR 修改（强制串行，见 `design/09-parallel-execution-and-conflict-matrix.md`）。
- CI：必须新增 `pnpm -C apps/desktop test:run`（Vitest 组件/Store），否则 P1 的 store tests 无门禁。
- keytar：属于 native 依赖，必须明确 build/rebuild 策略与测试 stub（见 `design/06-security-hardening.md`）。

