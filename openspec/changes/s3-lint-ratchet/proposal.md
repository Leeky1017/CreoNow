# 提案：s3-lint-ratchet

## 背景

`docs/plans/unified-roadmap.md` 将 `s3-lint-ratchet` 定义为 Sprint 3 的模式统计治理项：基于 A7 审计命中统计建立 ESLint ratchet，防止违规数在后续 PR 中回升。当前仓库虽有 lint 规则，但缺少“基线对比 + 自动阻断”机制，跨会话开发时容易出现“本地无感、主干回退”。

## 变更内容

- 增补 lint 统计基线文件并固化在仓库中，作为后续比较基准。
- 新增 ratchet 脚本，对比“当前违规数 vs 基线违规数”，阻断新增违规。
- 将 ratchet 校验接入 CI 流水线，确保 PR 层自动化防回退。
- 明确基线更新流程，仅允许在受控变更中调整基线并留存审计理由。

## 受影响模块

- Cross Module Integration（治理门禁）— lint 统计基线、ratchet 判定策略、CI 接入。
- CI / 工具链（`.github/workflows`、`scripts/*`、ESLint 配置）— 规则阈值与自动阻断机制。

## 依赖关系

- 上游依赖：无（roadmap 标注“独立，建议 Sprint 3 初期设置”）。
- 横向协同：与 `s3-p3-backlog-batch` 并行时优先保证 ratchet 门禁先落地，减少后续批处理回退风险。

## 依赖同步检查（Dependency Sync Check）

- 核对输入：
  - `docs/plans/unified-roadmap.md` 中 `s3-lint-ratchet` 定义与文件清单。
  - `openspec/specs/cross-module-integration-spec.md` 的 CI/契约阻断治理原则。
- 核对项：
  - 目标限定为“违规数不回升”，非一次性清零。
  - ratchet 必须自动执行，不能依赖人工检查。
  - 基线更新必须具备可追溯审批信息，避免跨会话隐性回退。
- 结论：`NO_DRIFT`（与 Sprint 3 治理目标一致，可进入 TDD 规划）。

## 踩坑提醒（防复发）

- ratchet 规则若只在本地脚本执行、未接入 CI，会导致跨会话失效。
- 基线文件无更新纪律时，容易被“顺手刷新”掩盖真实回退。
- 仅校验总违规数不足以防止局部恶化，需保留规则维度统计可审计性。

## 代码问题审计重点

- 自动化防回退：CI 必须对新增违规“直接失败”，不接受人工口头确认替代。
- 自动化防回退：ratchet 脚本输出必须包含规则维度差异，便于定位回退来源。
- 跨会话复发防线：基线更新必须绑定 issue/变更理由，缺失上下文时默认阻断。
- 跨会话复发防线：本地与 CI 使用同一入口命令，避免“本地通过、CI 失败”双标准。

## 防治标签

- `RECUR` `FAKETEST`

## 不做什么

- 不在本 change 内批量修复所有历史 lint 违规。
- 不把 warn 规则强制升级为 error 作为一次性清理手段。
- 不扩展到与 lint 无关的构建或测试门禁改造。

## 审阅状态

- Owner 审阅：`PENDING`
