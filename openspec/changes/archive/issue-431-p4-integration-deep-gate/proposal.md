# 提案：issue-431-p4-integration-deep-gate

## 背景

P4 阶段的 change 已归档（Editor / Skill System / Version Control），但当前缺少归档后的跨模块深度集成复核证据。为避免“单模块通过但跨链路回归”，需要在最新控制面基线上执行一轮完整的集成门禁，并对发现的问题完成可追溯修复。

## 变更内容

- 新增一次 P4 归档后集成门禁流程：按固定顺序执行 typecheck/lint/contract/cross-module/unit/integration。
- 对门禁失败项进行标准化分类：
  - `IMPLEMENTATION_ALIGNMENT_REQUIRED`
  - `NEW_CONTRACT_ADDITION_CANDIDATE`
  - `SAFE_BASELINE_CLEANUP`
- 对实现侧缺口按 TDD 修复并补齐证据。
- 输出 P4 集成 Delta 报告（Implemented / Partial / Missing）。

## 受影响模块

- cross-module-integration-spec — 集成门禁与分类标准
- CI gate wiring — `package.json` 中 `test:integration` 与 `test:unit` 脚本覆盖清单
- Unit gate guard — `apps/desktop/tests/unit/p4-integration-gate-coverage.spec.ts`

## 不做什么

- 不新增超出 P4 范围的产品功能。
- 不跳过 TDD 直接改实现。
- 不直接修改主规范 `openspec/specs/**`。

## 审阅状态

- Owner 审阅：`PENDING`
