# Cross Module Integration Specification Delta

## Change: s3-lint-ratchet

### Requirement: Lint Ratchet 必须提供自动化防回退与跨会话复发防线 [ADDED]

系统必须基于 ESLint 违规基线执行 ratchet 校验，确保任意新提交不会提高违规总量，并保证基线更新具备可追溯治理约束。

- 必须保留可版本化的 lint 基线快照，作为 ratchet 比对输入 [ADDED]
- 必须在 CI 中自动执行 ratchet 校验，新增违规时直接阻断 [ADDED]
- 必须输出规则维度差异，支持定位具体回退来源 [ADDED]
- 必须对基线更新建立跨会话约束（变更理由、关联 issue、审计痕迹）[ADDED]

#### Scenario: CMI-S3-LR-S1 基线快照可稳定读取并参与比对 [ADDED]

- **假设** 仓库存在 lint 基线文件
- **当** ratchet 脚本读取并执行比较
- **则** 能稳定解析基线并生成当前统计对比
- **并且** 缺失关键字段时脚本必须失败并返回可诊断错误

#### Scenario: CMI-S3-LR-S2 新增违规在 CI 中被自动阻断 [ADDED]

- **假设** 某次提交引入新的 lint 违规
- **当** CI 执行 ratchet 校验
- **则** 流水线必须失败并阻止合并
- **并且** 输出新增违规的规则维度明细

#### Scenario: CMI-S3-LR-S3 基线更新具备跨会话可追溯约束 [ADDED]

- **假设** 开发者尝试更新 lint 基线
- **当** 提交基线变更
- **则** 必须包含关联 issue/变更理由并可审计
- **并且** 缺失治理上下文的基线刷新应被判定为不合规

## Out of Scope

- 一次性清零所有历史 lint 违规
- 将全部 warn 规则提升为 error
- 改造与 lint ratchet 无关的测试或发布流程
