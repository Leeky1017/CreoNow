# Delta Spec — creonow-audit-remediation

## Added Requirements

### DELTA-REQ-001: Full Rewrite Required

系统 MUST 将 `openspec/specs/creonow-audit-remediation/` 作为全量重写交付，不可复用旧稿内容。

#### Scenario: User-invalidated draft

- GIVEN 当前仓库存在历史审计重构稿
- WHEN 用户明确声明“原有内容不作数，全部重写”
- THEN 交付 MUST 为全新生成的 spec/design/task_cards 资产，且旧稿不作为来源。

### DELTA-REQ-002: One-to-one Mapping Integrity

重写结果 MUST 保持审计 #1..#39 与 requirements、task cards 的一对一关系。

#### Scenario: Mapping audit to cards

- GIVEN 审计问题列表 #1..#39 已确定
- WHEN 生成 requirement 和任务卡
- THEN 每个审计问题 MUST 对应唯一 `CNAUD-REQ-xxx` 与唯一任务卡。

### DELTA-REQ-003: Verification Status Governance

每张任务卡 MUST 包含 `verification_status` 字段，并使用 `verified|stale|needs-recheck` 之一。

#### Scenario: Status distribution validation

- GIVEN 39 张任务卡已生成
- WHEN 完成交付前校验
- THEN 任务卡中的状态统计 MUST 与 spec 中汇总一致。

### DELTA-REQ-004: Priority Distribution Correction

交付 MUST 采用修正后的优先级分布：P0=7、P1=17、P2=15。

#### Scenario: Index consistency

- GIVEN 所有任务卡按优先级归类
- WHEN 生成 task_cards/index.md
- THEN P0/P1/P2 分组计数 MUST 与 spec 声明一致。
