# Proposal: issue-597-aud-change-docs-archive

## Why

`openspec/changes/aud-*` 的 Change 产物已在 Wave0~Wave3 完成交付并合并到 `main`，但当前这些 Change 文档仍处于模板级质量（泛化 MUST/Scenario、缺少 Scenario ID、缺少 Scenario->Test 可追踪表、Evidence 缺少 RUN_LOG/PR 指针、6.3 Main Session Audit 未勾选），导致治理审计与归档无法通过（Stage-2 REJECT）。

本任务的目标是：把已交付事实“写回”到 Change 文档，使其达到 archived-change 质量并可被机器/人工审计，然后将全部 `aud-*` 归档并把 `EXECUTION_ORDER.md` 收敛到 active=0 的真实状态。

## What Changes

- 重写 22 个 `openspec/changes/aud-*` 的 `proposal.md` / `specs/**/spec.md` / `tasks.md`
  - 将 Requirement/Scenario 从模板措辞升级为可验证、可测量的具体条款
  - 为每个 Scenario 分配一致的 Scenario ID（按模块前缀 + `AUD` + 变更编号）
  - 在 `tasks.md` 增加 `Scenario -> Test` 映射表（测试文件路径 + 用例名）
  - 在 Evidence 中补齐 Wave RUN_LOG + PR 指针，并通过指向 RUN_LOG 的 `## Main Session Audit` 完成 6.3
- `git mv openspec/changes/aud-* openspec/changes/archive/`，并更新 `openspec/changes/EXECUTION_ORDER.md`（active set=0，日期准确）
- 运行 preflight，创建 PR 并开启 auto-merge，确保 required checks 全绿后完成归档闭环

## Impact

- Affected specs:
  - `openspec/changes/aud-*/**`
  - `openspec/changes/archive/aud-*/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Affected code:
  - `openspec/_ops/task_runs/ISSUE-597.md`
  - `rulebook/tasks/issue-597-aud-change-docs-archive/**`
- Breaking change: NO
- User benefit: 审计整改 Change 文档可追踪、可验证、可归档；执行面 active change 状态与事实一致，避免后续任务误依赖与治理漂移。
