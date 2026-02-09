# 提案：issue-328-cross-module-contract-alignment-gate

## 背景

Layer2/Layer3 里程碑集成检查（issue-326）已识别跨模块契约漂移，但当前流程仍依赖人工核对。若不将 cross-module 对齐规则机器化，后续 PR 仍可在“未显式登记漂移”的情况下通过，导致规范与实现再次分叉。

## 变更内容

- 新增可机器校验的 cross-module 契约基线文件（通道、错误码、envelope、漂移例外）。
- 新增脚本门禁 `cross-module:check`，用于校验“实现与基线对齐 + 漂移必须显式登记”。
- 将门禁接入 CI（`ci.yml`）与本地 `agent_pr_preflight.py`，形成提交前与合并前双重拦截。
- 为新增门禁补齐 TDD 测试与 RUN_LOG 证据。

## 受影响模块

- Cross Module Integration — `openspec/specs/cross-module-integration-spec.md`（通过 delta 扩展，不直接修改主 spec）
- CI/GitHub Gate — `.github/workflows/ci.yml`
- Preflight Gate — `scripts/agent_pr_preflight.py`
- Contract Guard Script — `scripts/cross-module-contract-gate.ts`

## 不做什么

- 不在本 change 中执行大规模 IPC 运行时代码迁移（如 `skill:*` 全量重命名）。
- 不直接修改 `openspec/specs/**` 主规范。
- 不新增 required check 名称（保持 `ci`、`openspec-log-guard`、`merge-serial` 不变）。

## 审阅状态

- Owner 审阅：`PENDING`
