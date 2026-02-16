## ADDED Requirements

### Requirement: 审计问题拆解必须形成可执行 change 体系

Lead MUST 将审计问题拆解为非重叠、可独立验证的 change 单元，并保持依赖顺序可追踪。

#### Scenario: 全量问题映射为细粒度 change

- **Given** 审计文档已识别 C/H/M 问题清单
- **When** 执行 change 拆解
- **Then** 每个问题类别必须映射到一个或多个 change，且零遗漏
- **And** 每个 change 必须包含 `proposal/spec/tasks`

#### Scenario: Owner 代审与执行编排可追溯

- **Given** change 拆解已完成
- **When** 进入准入审批
- **Then** Lead 必须给出每个 change 的 PASS/FAIL 结论与依据
- **And** 必须输出执行波次与双层审计流程
