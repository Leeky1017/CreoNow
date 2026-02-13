# Cross Module Integration Specification Delta

## Change: main-session-audit-hard-gate

### Requirement: Main Session Audit Hard Gate [ADDED]

RUN_LOG 必须包含可机器校验的主会话审计段。preflight 与 `openspec-log-guard` 必须基于同一字段和同一通过条件执行阻断。

#### Scenario: Main Session Audit 全部通过时放行 [ADDED]

- **假设** RUN_LOG 包含 `## Main Session Audit` 固定字段
- **当** 审计字段满足全部通过条件
- **则** preflight 与 `openspec-log-guard` 通过该门禁
- **并且** 不改变现有 required checks 名称

#### Scenario: 审计字段缺失或不合法时阻断 [ADDED]

- **假设** RUN_LOG 缺少 Main Session Audit 或字段值非法
- **当** 执行 preflight 或 PR 触发 `openspec-log-guard`
- **则** 门禁失败并阻断交付
- **并且** preflight 报错前缀统一为 `[MAIN_AUDIT]`

#### Scenario: 审计对象不是当前 HEAD 时阻断 [ADDED]

- **假设** `Reviewed-HEAD-SHA` 与当前 HEAD 不一致
- **当** 执行 preflight 或 PR 触发 `openspec-log-guard`
- **则** 门禁失败并阻断交付
- **并且** 只有审计对象等于当前 HEAD 才允许进入合并
