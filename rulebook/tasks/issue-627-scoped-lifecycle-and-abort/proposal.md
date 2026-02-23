# Proposal: issue-627-scoped-lifecycle-and-abort

更新时间：2026-02-23 22:27

## Why
将 `openspec/changes/issue-617-scoped-lifecycle-and-abort/` 作为 Issue #627 的交付目标，补齐 Spec/Rulebook/RUN_LOG 治理脚手架与跨模块 spec 缺口清单，确保后续实现严格按 TDD + 门禁全绿收口。

## What Changes
- 审阅并标注 `issue-617-scoped-lifecycle-and-abort` change 文档中的跨模块 spec 缺口/重叠点（BE-SLA-S2/S3/S4）。
- 建立 Issue #627 的 Rulebook task（active）并通过 validate。
- 准备 Issue #627 RUN_LOG 骨架（不写入占位 PR URL；待 PR 创建后回填真实 URL）。
- 评估是否需要将 change 目录从 `issue-617-*` 重命名到 `issue-627-*`（仅在门禁/治理要求必须时执行）。

## Impact
- Affected specs: `openspec/changes/issue-617-scoped-lifecycle-and-abort/**`（+ 若补齐则涉及 `ipc` / `skill-system` / `context-engine` delta）
- Affected code: 无（本任务以文档与治理脚手架为主）
- Breaking change: NO（仅文档/治理资产）
- User benefit: 实现阶段可按明确契约落地取消/超时/资源回收语义，避免跨模块“幽灵执行/槽位泄漏/资源不闭环”
