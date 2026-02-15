## ADDED Requirements

### Requirement: Sprint3 Wave2 总控交付必须由主会话统一审计并收口

主会话 MUST 以单一总控分支集成 W2 全部子任务产出，并在合并前完成主会话审计、变更归档、执行顺序同步和门禁验证。

#### Scenario: W2 子任务全部纳入总控集成

- **Given** W2 子任务分支均已推送
- **When** 主会话执行总控集成
- **Then** 总控分支 MUST 集成全部子任务提交且无遗漏
- **And** 主会话 MUST 对每个子任务执行 fresh verification

#### Scenario: 完成 change 必须归档并更新执行顺序

- **Given** W2 8 个 change 的 tasks 全部勾选完成
- **When** 主会话准备提交集成分支
- **Then** MUST 迁移到 `openspec/changes/archive/`
- **And** MUST 更新 `openspec/changes/EXECUTION_ORDER.md` 的活跃拓扑与时间戳

#### Scenario: 门禁通过后才可声明交付完成

- **Given** 总控 PR 已创建
- **When** 进入交付收口阶段
- **Then** MUST 开启 auto-merge 并等待 `ci`、`openspec-log-guard`、`merge-serial` 全绿
- **And** 仅在 PR merged + controlplane main 同步后才可完成收口
