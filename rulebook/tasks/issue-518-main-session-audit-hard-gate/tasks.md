## 1. Implementation

- [x] 1.1 Add `validate_main_session_audit(run_log, head_sha)` and wire into preflight main flow.
- [x] 1.2 Add CI-level Main Session Audit guard in `openspec-log-guard`.
- [x] 1.3 Keep required checks unchanged (`ci` / `openspec-log-guard` / `merge-serial`).

## 2. Testing

- [x] 2.1 Add unit tests for pass + fail scenarios in `scripts/tests/test_agent_pr_preflight.py`.
- [x] 2.2 Run `python3 -m unittest scripts/tests/test_agent_pr_preflight.py` and verify green.
- [x] 2.3 Run `scripts/agent_pr_preflight.sh` and verify gate behavior.

## 3. Documentation

- [x] 3.1 Update OpenSpec change docs (`proposal/tasks/spec`) with TDD mapping and evidence.
- [x] 3.2 Update `openspec/changes/_template/tasks.md` evidence checklist.
- [x] 3.3 Update `docs/delivery-skill.md` and `docs/delivery-rule-mapping.md`.
