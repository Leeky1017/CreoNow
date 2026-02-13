## 1. Specification

- [x] 1.1 审阅并确认主会话审计固定字段与取值域
- [x] 1.2 审阅并确认主会话审计通过条件（全量 AND 条件）
- [x] 1.3 审阅并确认 preflight 与 CI 的一致性约束
- [x] 1.4 若存在上游依赖，先完成依赖同步检查（Dependency Sync Check）并记录“无漂移/已更新”；无依赖则标注 N/A

## 2. TDD Mapping（先测前提）

- [x] 2.1 将 delta spec 的每个 Scenario 映射为至少一个测试用例
- [x] 2.2 为每个测试标注对应 Scenario ID，建立可追踪关系
- [x] 2.3 设定门禁：未出现 Red（失败测试）不得进入实现

### Scenario → 测试映射

- [x] S1「Main Session Audit 全部通过时放行」→ `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_should_pass_with_complete_section`
- [x] S2「审计字段缺失或不合法时阻断」→
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_should_fail_when_section_missing`
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_should_fail_when_any_gate_field_is_fail`
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_should_fail_when_blocking_issues_not_zero`
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_should_fail_when_decision_not_accept`
- [x] S3「审计对象不是签字提交的 HEAD^ 时阻断」→ `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_should_fail_when_reviewed_sha_mismatch`
- [x] S4「签字提交隔离（仅 RUN_LOG 可变更）」→
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_signature_commit_should_pass_when_only_run_log_changed`
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_signature_commit_should_fail_when_run_log_not_changed`
  - `scripts/tests/test_agent_pr_preflight.py::test_validate_main_session_audit_signature_commit_should_fail_when_other_files_changed`

## 3. Red（先写失败测试）

- [x] 3.1 新增 Main Session Audit 通过路径测试并确认先失败
- [x] 3.2 新增字段缺失/字段 FAIL/Blocking-Issues 非零/Decision 非 ACCEPT/SHA 不一致失败测试并确认先失败
- [x] 3.3 新增签字提交隔离（仅 RUN_LOG 可变更）测试并确认先失败
- [x] 3.4 记录 Red 失败输出与关键日志至 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 新增并接入 `validate_main_session_audit(run_log, head_sha)`
- [x] 4.2 preflight 缺字段、格式错、值不合法、条件不满足统一 `RuntimeError`，报错前缀 `[MAIN_AUDIT]`
- [x] 4.3 preflight 与 CI 同步校验 `Reviewed-HEAD-SHA == HEAD^`，并强制签字提交仅变更 RUN_LOG
- [x] 4.4 `openspec-log-guard.yml` 增加同等 Main Session Audit 校验并阻断未审计场景
- [x] 4.5 同步模板与文档（tasks template / delivery-skill / delivery-rule-mapping）

## 5. Refactor（保持绿灯）

- [x] 5.1 抽取校验常量与解析逻辑，避免重复正则分支
- [x] 5.2 保持新增测试与既有测试全绿

## 6. Evidence

- [ ] 6.1 记录 RUN_LOG（含 Red 失败证据、Green 通过证据与关键命令输出）
- [x] 6.2 记录 Dependency Sync Check 的输入、核对结论与后续动作（无漂移/已更新）
