# Proposal: issue-524-s0-doc-hardening

## Why

Sprint0 change 文档与 `docs/plans/unified-roadmap.md` 在“防再犯”表达上存在偏差：任务语义基本一致，但缺少 `踩坑提醒` 与 `防治标签`，会降低后续 Agent 的约束强度并增加重复犯错风险。

## What Changes

- 为 8 个 `openspec/changes/s0-*/proposal.md` 补齐 `踩坑提醒` 段。
- 为 8 个 `openspec/changes/s0-*/proposal.md` 补齐 `防治标签` 段并对齐 roadmap 标签集合。
- 保持现有 Requirement/Scenario、依赖关系与执行顺序语义不变。

## Impact

- Affected specs:
  - `openspec/changes/s0-fake-queued-fix/proposal.md`
  - `openspec/changes/s0-window-load-catch/proposal.md`
  - `openspec/changes/s0-app-ready-catch/proposal.md`
  - `openspec/changes/s0-metadata-failfast/proposal.md`
  - `openspec/changes/s0-skill-loader-error/proposal.md`
  - `openspec/changes/s0-sandbox-enable/proposal.md`
  - `openspec/changes/s0-kg-async-validate/proposal.md`
  - `openspec/changes/s0-context-observe/proposal.md`
- Affected code: 无（文档补丁）
- Breaking change: NO
- User benefit: Sprint0 change 文档具备可执行的防再犯约束，降低后续 Agent 重复引入同类问题的概率。
