# Proposal: issue-526-sprint0-group-a-c-delivery

## Why

Sprint0 并行组 A 与并行组 C 的 6 个 change 仍停留在文档阶段，核心风险（空内容伪 queued、启动链路吞错、sandbox 关闭、skill loader 静默降级等）未进入可执行代码与门禁验证。需要一次治理化交付把实现、测试、审计与归档闭环打通。

## What Changes

- 实现并验证 6 个 Sprint0 change：
  - `s0-fake-queued-fix`
  - `s0-window-load-catch`
  - `s0-app-ready-catch`
  - `s0-skill-loader-error`
  - `s0-sandbox-enable`
  - `s0-context-observe`
- 增补对应单测/E2E 断言与 IPC 契约一致性。
- 主会话执行缺陷优先审计并修复审计发现。
- 将已完成 change 归档到 `openspec/changes/archive/`，同步 `EXECUTION_ORDER.md`。

## Impact

- Affected specs: `openspec/changes/s0-*/**`（上述 6 项），`openspec/changes/EXECUTION_ORDER.md`
- Affected code: `apps/desktop/main/src/**`, `apps/desktop/preload/src/**`, `apps/desktop/tests/**`, `scripts/contract-generate.ts`, `package.json`
- Breaking change: NO（对外 IPC envelope 兼容，新增 `skipped + taskId:null` 为约定内语义修正）
- User benefit: 启动与安全边界更稳健、故障可观测性提升、KG 空内容语义修复且测试门禁可持续回归
