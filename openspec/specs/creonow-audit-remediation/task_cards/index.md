# Task Cards Index — CreoNow Audit Remediation 39

Spec: openspec/specs/creonow-audit-remediation/spec.md

## Summary

- Total cards: 39
- P0: 7
- P1: 17
- P2: 15
- 每张卡必须包含 verification_status（verified / stale / needs-recheck）。

## Card List

### P0

- P0-001 #1 AI model 参数硬编码为 fake — task_cards/p0/P0-001-ai-model-hardcoded-fake.md
- P0-002 #2 Anthropic max_tokens 硬编码 256 — task_cards/p0/P0-002-anthropic-max-tokens-hardcoded.md
- P0-003 #3 ModelPicker 与后端链路断线 — task_cards/p0/P0-003-modelpicker-disconnected.md
- P0-004 #4 migration version 可跳跃导致缺失 — task_cards/p0/P0-004-migration-version-gap.md
- P0-005 #5 Zen Mode 不是可编辑链路 — task_cards/p0/P0-005-zen-mode-not-editable.md
- P0-006 #6 DB 降级策略与错误边界不一致 — task_cards/p0/P0-006-db-degrade-and-error-boundary.md
- P0-007 #7 核心 --color-accent token 缺失 — task_cards/p0/P0-007-accent-token-missing.md

### P1

- P1-001 #8 编辑器仅使用 StarterKit — task_cards/p1/P1-001-editor-starterkit-only.md
- P1-002 #9 编辑器排版未对齐设计 token — task_cards/p1/P1-002-editor-typography-token-mismatch.md
- P1-003 #10 IpcInvoke 在多个 store 重复定义 — task_cards/p1/P1-003-ipcinvoke-duplication.md
- P1-004 #11 ServiceResult/ipcError 重复实现 — task_cards/p1/P1-004-service-result-ipcerror-duplication.md
- P1-005 #12 Tailwind 颜色映射缺失 — task_cards/p1/P1-005-tailwind-color-mapping-missing.md
- P1-006 #13 业务 UI 存在大量硬编码颜色 — task_cards/p1/P1-006-hardcoded-color-literals.md
- P1-007 #14 Autosave 状态与时序风险 — task_cards/p1/P1-007-autosave-race-and-status.md
- P1-008 #15 editor/file bootstrap 协调缺口 — task_cards/p1/P1-008-store-bootstrap-coordination-gap.md
- P1-009 #16 templateStore 违反架构契约 — task_cards/p1/P1-009-template-store-contract-violation.md
- P1-010 #17 AI feedback 返回成功但未持久化 — task_cards/p1/P1-010-ai-feedback-not-persisted.md
- P1-011 #18 AI stream 缺 renderer 客户端超时 — task_cards/p1/P1-011-ai-stream-client-timeout-missing.md
- P1-012 #19 ModePicker 仅装饰无语义分发 — task_cards/p1/P1-012-modepicker-decorative-only.md
- P1-013 #20 CI 未运行 desktop vitest 门禁 — task_cards/p1/P1-013-ci-vitest-gate.md
- P1-014 #21 Toast 组件存在但未全局接入 — task_cards/p1/P1-014-toast-global-integration-missing.md
- P1-015 #22 缺少 @shared 等路径别名 — task_cards/p1/P1-015-path-alias-missing.md
- P1-016 #23 ChatHistory 使用 mock 历史 — task_cards/p1/P1-016-chat-history-mock-data.md
- P1-017 #24 Zen Mode 存在硬编码样式 — task_cards/p1/P1-017-zen-mode-hardcoded-style.md

### P2

- P2-001 #25 packages/shared 利用率不足 — task_cards/p2/P2-001-shared-package-underused.md
- P2-002 #26 AppShell 文件过大职责过多 — task_cards/p2/P2-002-appshell-oversized.md
- P2-003 #27 OutlinePanel 文件过大 — task_cards/p2/P2-003-outlinepanel-oversized.md
- P2-004 #28 测试运行入口碎片化 — task_cards/p2/P2-004-fragmented-test-runners.md
- P2-005 #29 features 测试覆盖分布不均 — task_cards/p2/P2-005-uneven-feature-test-coverage.md
- P2-006 #30 生产代码散落 console 调用 — task_cards/p2/P2-006-production-console-usage.md
- P2-007 #31 token 存在双源漂移 — task_cards/p2/P2-007-token-dual-source.md
- P2-008 #32 accent token 命名重叠冗余 — task_cards/p2/P2-008-redundant-accent-tokens.md
- P2-009 #33 Provider 嵌套层级过深 — task_cards/p2/P2-009-deep-provider-nesting.md
- P2-010 #34 registerIpcHandlers 扁平臃肿 — task_cards/p2/P2-010-flat-ipc-registrar.md
- P2-011 #35 document_versions 缺修剪策略 — task_cards/p2/P2-011-version-retention-missing.md
- P2-012 #36 ExportDialog 使用 !important — task_cards/p2/P2-012-exportdialog-important-style.md
- P2-013 #37 AiPanel 内嵌 style 标签 — task_cards/p2/P2-013-aipanel-inline-style-tag.md
- P2-014 #38 SearchPanel mock 与假性能文案 — task_cards/p2/P2-014-searchpanel-mock-and-fake-metrics.md
- P2-015 #39 ZenModeOverlay memo 依赖导致内容过时 — task_cards/p2/P2-015-zenmodeoverlay-stale-memo-deps.md
