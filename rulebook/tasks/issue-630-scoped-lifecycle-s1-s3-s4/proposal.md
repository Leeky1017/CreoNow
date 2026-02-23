# Proposal: issue-630-scoped-lifecycle-s1-s3-s4

更新时间：2026-02-24 02:36

## Why
将 `openspec/changes/issue-617-scoped-lifecycle-and-abort/` 中 Scoped Lifecycle 的 BE-SLA-S1/S3/S4 场景落实到可测试的实现与集成验证，避免项目切换/解绑时出现资源不闭环、并发槽位泄漏与状态漂移。

## What Changes
- 合入 S1/S3/S4 实现分支并解决冲突，确保行为与 change spec 一致。
- 补齐/更新对应的契约测试与回归验证证据，保证 required checks 全绿后 auto-merge 交付。

## Impact
- Affected specs: `openspec/changes/issue-617-scoped-lifecycle-and-abort/**`
- Affected code: `apps/desktop/main/src/**`（以项目生命周期与会话/IPC 资源回收相关模块为主）
- Breaking change: NO
- User benefit: 项目切换/解绑更可预测，避免幽灵执行与槽位/资源泄漏
