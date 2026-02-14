## 1. Specification

- [x] 1.1 审阅 `docs/plans/unified-roadmap.md` 中 `s2-demo-params-cleanup（A1-M-001 + A1-M-002）` 的问题定义与验收边界
- [x] 1.2 审阅 `openspec/specs/workbench/spec.md`，确认仅清理 demo 参数噪声，不改变业务行为
- [x] 1.3 审阅/补充 `openspec/changes/s2-demo-params-cleanup/specs/workbench-delta.md`，确认 Requirement 与 Scenario 可直接映射测试
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

Specification notes:
- Dependency Sync Check: `N/A`（本 change 无上游依赖，基于 proposal 的依赖声明与 roadmap 条目核对）。

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个组件行为测试
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

Scenario mapping:
- `S1` 生产组件在无 demo 参数下按回调驱动状态
  - `AiInlineConfirm > [S1] waits for onAccept callback resolution before leaving applying state`
  - `AiErrorCard > [S1] uses rejected onRetry callback as retry failure signal`
- `S2` Story 演示参数不进入生产组件契约
  - `AiInlineConfirm > [S2] does not expose demo-only props in AiInlineConfirmProps`
  - `AiErrorCard > [S2] does not expose demo-only props in AiErrorCardProps`

## 3. Red（先写失败测试）

- [x] 3.1 编写“移除 demo 参数后仍正确渲染”的失败测试
- [x] 3.2 编写“重试/确认结果由外部回调决定”的失败测试
- [x] 3.3 运行目标测试并记录 Red 证据

Red evidence:
- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/components/features/AiDialogs/AiDialogs.test.tsx`
- Result: `FAILED`（新增 2 条断言失败）
  - `AiInlineConfirm > waits for onAccept callback resolution before leaving applying state`（期望回调已调用，实际 0 次）
  - `AiErrorCard > uses rejected onRetry callback as retry failure signal`（期望回调已调用，实际 0 次）

## 4. Green（最小实现通过）

- [x] 4.1 移除 demo-only props 并改由真实回调驱动状态，让 Red 转绿
- [x] 4.2 同步 Story 适配，保持生产组件 API 收敛

## 5. Refactor（保持绿灯）

- [x] 5.1 清理遗留分支和无效参数注释
- [x] 5.2 复跑测试，确认组件行为与 story 演示边界清晰

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
- [ ] 6.3 记录 Main Session Audit（Audit-Owner/Reviewed-HEAD-SHA=签字提交 HEAD^/三项 PASS/Blocking-Issues=0/Decision=ACCEPT），并确认签字提交仅变更当前任务 RUN_LOG

Green evidence:
- Command:
  - `pnpm -C apps/desktop exec vitest run renderer/src/components/features/AiDialogs/AiDialogs.test.tsx`
  - `pnpm -C apps/desktop exec tsc --noEmit`
- Result:
  - `AiDialogs.test.tsx`: `49 passed, 0 failed`
  - `tsc --noEmit`: `exit 0`

Governance note:
- 根据当前执行指令“不要改 RUN_LOG”，`6.1` 与 `6.3` 在本次 commit 保持未勾选。
