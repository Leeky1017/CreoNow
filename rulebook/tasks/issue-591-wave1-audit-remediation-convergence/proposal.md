# Proposal: issue-591-wave1-audit-remediation-convergence

## Why

Wave0（PR #590）已提供安全/测试/运行时基线，但审计报告中的 Wave1 依赖收敛问题仍未交付。需要在同一治理链路下交付 7 个 change（c1b/c2b/c3b/h2b/h4/m3/m4），确保 renderer 异步状态收敛、IPC project access 统一断言、测试纳入与诊断增强达到可验证状态，并解锁 Wave2/Wave3。

## What Changes

- 完成 renderer/store 异步状态收敛：失败路径不再卡 loading，状态进入确定终态。
- 将 main unit 执行计划改为可导入构建函数并补齐覆盖守护测试。
- 引入 IPC `projectAccessGuard`，在 contextFs/memory/knowledge 等敏感通道统一校验 session-project 绑定。
- 在 contextFs 增加慢 I/O offload 阈值与超限保护策略。
- 修复 AiPanel Judge 自动评估失败后 runId 锁死，保障同 run 可重试。
- 让测试侧 token 估算与生产 `@shared/tokenBudget` 口径一致。
- 为 preload `INVALID_ARGUMENT` 增加结构摘要与序列化错误路径元数据。

## Impact

- Affected specs:
  - `openspec/changes/aud-c1b-renderer-async-state-convergence/tasks.md`
  - `openspec/changes/aud-c2b-main-unit-suite-inclusion/tasks.md`
  - `openspec/changes/aud-c3b-ipc-assert-project-access/tasks.md`
  - `openspec/changes/aud-h2b-main-io-offload-guard/tasks.md`
  - `openspec/changes/aud-h4-judge-eval-retry-safety/tasks.md`
  - `openspec/changes/aud-m3-test-token-estimator-parity/tasks.md`
  - `openspec/changes/aud-m4-preload-diagnostic-metadata/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/{stores/aiStore.ts,features/ai/AiPanel.tsx}`
  - `apps/desktop/main/src/ipc/{context.ts,contextFs.ts,knowledgeGraph.ts,memory.ts,index.ts,projectAccessGuard.ts}`
  - `apps/desktop/main/src/services/context/contextFs.ts`
  - `apps/desktop/preload/src/ipcGateway.ts`
  - `scripts/run-discovered-tests.ts`
  - `apps/desktop/tests/helpers/llm-mock.ts`
- Breaking change: NO
- User benefit: Wave1 风险收敛可追溯落盘，并可无漂移解锁 Wave2/Wave3 执行。
