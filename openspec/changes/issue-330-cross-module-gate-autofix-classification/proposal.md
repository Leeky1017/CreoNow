# 提案：issue-330-cross-module-gate-autofix-classification

## 背景

issue-328 已建立 cross-module 契约门禁（CI + preflight），能够阻断未登记漂移；但在开发分支中，门禁失败后仍依赖人工判断“这是新增契约，还是实现命名/契约语义未对齐”。

这会导致修复链路慢、重复劳动多，也不利于 Agent 在一次迭代中完成“失败 -> 修复 -> 新 commit”的闭环。

## 变更内容

- 新增 cross-module 失败项分类能力：将门禁失败明确分为
  - `IMPLEMENTATION_ALIGNMENT_REQUIRED`（应修实现/契约位置）
  - `NEW_CONTRACT_ADDITION_CANDIDATE`（疑似新增，需走 delta spec + baseline）
  - `SAFE_BASELINE_CLEANUP`（可自动清理的陈旧漂移）
- 新增开发分支专用自动修复命令 `cross-module:autofix`：
  - 自动应用 `SAFE_BASELINE_CLEANUP` 到 baseline；
  - 支持 `--commit` 在 `task/<N>-<slug>` 分支自动提交修复 commit。
- 保持 CI 行为不变：CI 仅执行 `cross-module:check`，不执行自动修复。
- 为自动修复与分类补齐 TDD 测试、RUN_LOG 证据、使用说明。

## 受影响模块

- Cross Module Integration — `openspec/specs/cross-module-integration-spec.md`（通过 delta 扩展）
- Guard Script — `scripts/cross-module-contract-gate.ts`
- Autofix Script — `scripts/cross-module-contract-autofix.ts`（新增）
- NPM scripts — `package.json`
- Unit tests — `apps/desktop/tests/unit/cross-module-contract-gate.spec.ts`（及新增测试文件）

## 不做什么

- 不在本 change 中执行全量 IPC 命名迁移。
- 不将自动修复接入 CI required checks。
- 不直接修改 `openspec/specs/**` 主规范。

## 审阅状态

- Owner 审阅：`PENDING`
