# Design 05 — Testing & CI

## Scope

- CNAUD-REQ-020
- CNAUD-REQ-021
- CNAUD-REQ-028
- CNAUD-REQ-029

## Current-State Evidence

- CNAUD-REQ-020 已在当前 CI 中落地，状态为 stale（审计项已过时）。
- Toast 原语已实现，但应用根层仍缺统一 Provider/Viewport 接入与业务触发路径。
- root test:unit 仍是手工串联 tsx 多文件执行。
- features 测试分布不均，部分高频面板缺测试。

## Target Design

1. CI Gates as Contract
   - 保持并强化 desktop vitest 门禁（防回退）。
   - 对 stale 项采用“关闭证据卡”而非删除映射。

2. Toast Integration
   - 在根组件接入全局 Toast 容器。
   - 统一 toast 调用 API 与错误展示策略。

3. Runner Unification
   - 保留 unit/integration/e2e 分层。
   - 将手工串联逐步收敛为可维护 runner。

4. Coverage Risk Matrix
   - 按业务风险定义最低覆盖目标。
   - 对“无测试高风险 feature”建立优先补测清单。

## Verification Gates

- CI required checks 不得缺失或降级。
- toast 全链路测试（显示/关闭/并发）。
- 覆盖率/分布报告纳入 RUN_LOG。
