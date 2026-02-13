# 提案：main-session-audit-hard-gate

## 背景

当前流程中，子代理报告“已完成”并不等于主会话已完成审计签字。现有门禁只校验 RUN_LOG 基础字段与 Rulebook/OpenSpec 结构，未强制“主会话审计通过”这一阻断条件。

不改的风险：

- 子代理产出在缺少主会话审计结论时仍可能进入合并流程。
- preflight 与 CI 不能阻断“未审计/审计失败/审计对象非当前 HEAD”的风险提交。
- RUN_LOG 无法作为“主会话最终责任签字”的机器可验证证据。

## 变更内容

- 在 RUN_LOG 增加固定、可机读的 `## Main Session Audit` 段并定义通过条件。
- 在 `scripts/agent_pr_preflight.py` 增加 `validate_main_session_audit(run_log, head_sha)` 并接入主流程。
- 在 `.github/workflows/openspec-log-guard.yml` 增加同等 Main Session Audit 校验，确保 PR 到 `main` 时可阻断。
- 更新 `openspec/changes/_template/tasks.md` 的 Evidence 清单，显式要求主会话审计记录与通过条件。
- 同步更新 `docs/delivery-skill.md` 与 `docs/delivery-rule-mapping.md`。

## 受影响模块

- 交付门禁链路：`scripts/agent_pr_preflight.py`、`scripts/tests/test_agent_pr_preflight.py`、`.github/workflows/openspec-log-guard.yml`
- OpenSpec change template：`openspec/changes/_template/tasks.md`
- 交付文档：`docs/delivery-skill.md`、`docs/delivery-rule-mapping.md`

## 不做什么

- 不新增 required check 名称（保持 `ci` / `openspec-log-guard` / `merge-serial`）。
- 不为单个任务定制临时 CI 逻辑。
- 不依赖子代理自报完成作为交付依据。

## 审阅状态

- Owner 审阅：`PENDING`
