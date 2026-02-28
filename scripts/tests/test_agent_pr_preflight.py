import os
import tempfile
import unittest
import sys
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import agent_pr_preflight  # noqa: E402


class RulebookTaskResolutionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        os.makedirs(os.path.join(self.repo, "rulebook", "tasks", "archive"), exist_ok=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _write_task_files(self, task_dir: str) -> None:
        os.makedirs(task_dir, exist_ok=True)
        for name in (".metadata.json", "proposal.md", "tasks.md"):
            with open(os.path.join(task_dir, name), "w", encoding="utf-8") as fp:
                fp.write("ok")

    def test_should_resolve_active_task_dir_when_active_exists(self) -> None:
        task_id = "issue-350-self-archive-nonrecursive-governance"
        active_dir = os.path.join(self.repo, "rulebook", "tasks", task_id)
        self._write_task_files(active_dir)

        location = agent_pr_preflight.resolve_rulebook_task_location(self.repo, task_id)

        self.assertEqual("active", location.kind)
        self.assertEqual(active_dir, location.path)

    def test_should_resolve_archive_task_dir_when_only_archive_exists(self) -> None:
        task_id = "issue-350-self-archive-nonrecursive-governance"
        archive_dir = os.path.join(
            self.repo,
            "rulebook",
            "tasks",
            "archive",
            f"2026-02-09-{task_id}",
        )
        self._write_task_files(archive_dir)

        location = agent_pr_preflight.resolve_rulebook_task_location(self.repo, task_id)

        self.assertEqual("archive", location.kind)
        self.assertEqual(archive_dir, location.path)

    def test_should_fail_when_active_and_archive_both_exist(self) -> None:
        task_id = "issue-350-self-archive-nonrecursive-governance"
        self._write_task_files(os.path.join(self.repo, "rulebook", "tasks", task_id))
        self._write_task_files(
            os.path.join(self.repo, "rulebook", "tasks", "archive", f"2026-02-09-{task_id}")
        )

        with self.assertRaisesRegex(RuntimeError, "both active and archived"):
            agent_pr_preflight.resolve_rulebook_task_location(self.repo, task_id)

    def test_should_fail_when_task_missing_in_active_and_archive(self) -> None:
        task_id = "issue-350-self-archive-nonrecursive-governance"

        with self.assertRaisesRegex(RuntimeError, "required task dir missing"):
            agent_pr_preflight.resolve_rulebook_task_location(self.repo, task_id)


class MainSessionAuditValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.head_sha = "a" * 40

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _write_run_log(self, body: str) -> str:
        path = os.path.join(self.repo, "ISSUE-518.md")
        with open(path, "w", encoding="utf-8") as fp:
            fp.write(body)
        return path

    def _run_log_with_audit(
        self,
        *,
        audit_owner: str = "main-session",
        reviewed_sha: str | None = None,
        spec_compliance: str = "PASS",
        code_quality: str = "PASS",
        fresh_verification: str = "PASS",
        blocking_issues: str = "0",
        decision: str = "ACCEPT",
    ) -> str:
        reviewed = reviewed_sha or self.head_sha
        return (
            "# ISSUE-518\n\n"
            "- Issue: #518\n"
            "- Branch: task/518-main-session-audit-hard-gate\n"
            "- PR: https://github.com/Leeky1017/CreoNow/pull/999\n\n"
            "## Plan\n\n"
            "- [x] plan\n\n"
            "## Runs\n\n"
            "- run\n\n"
            "## Main Session Audit\n"
            f"- Audit-Owner: {audit_owner}\n"
            f"- Reviewed-HEAD-SHA: {reviewed}\n"
            f"- Spec-Compliance: {spec_compliance}\n"
            f"- Code-Quality: {code_quality}\n"
            f"- Fresh-Verification: {fresh_verification}\n"
            f"- Blocking-Issues: {blocking_issues}\n"
            f"- Decision: {decision}\n"
        )

    def test_validate_main_session_audit_should_pass_with_complete_section(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit())

        agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_section_missing(self) -> None:
        run_log = self._write_run_log(
            "# ISSUE-518\n\n"
            "- Issue: #518\n"
            "- Branch: task/518-main-session-audit-hard-gate\n"
            "- PR: https://github.com/Leeky1017/CreoNow/pull/999\n\n"
            "## Plan\n- [x] plan\n\n"
            "## Runs\n- run\n"
        )

        with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\]"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_any_gate_field_is_fail(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit(code_quality="FAIL"))

        with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\]"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_blocking_issues_not_zero(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit(blocking_issues="2"))

        with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\]"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_decision_not_accept(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit(decision="REJECT"))

        with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\]"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_reviewed_sha_mismatch(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit(reviewed_sha="b" * 40))

        with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\]"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_reviewed_sha_placeholder(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit(reviewed_sha="PENDING_SHA"))

        with self.assertRaisesRegex(RuntimeError, r"placeholder 'PENDING_SHA'"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)

    def test_validate_main_session_audit_should_fail_when_reviewed_sha_not_hex(self) -> None:
        run_log = self._write_run_log(self._run_log_with_audit(reviewed_sha="123"))

        with self.assertRaisesRegex(RuntimeError, r"must be a 40-hex commit sha"):
            agent_pr_preflight.validate_main_session_audit(run_log, self.head_sha)


class TaskRunLogMainAuditSectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        self.run_log_rel = "openspec/_ops/task_runs/ISSUE-783.md"
        self.run_log_abs = os.path.join(self.repo, self.run_log_rel)
        os.makedirs(os.path.dirname(self.run_log_abs), exist_ok=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _write_run_log(self, content: str) -> None:
        with open(self.run_log_abs, "w", encoding="utf-8") as fp:
            fp.write(content)

    def test_validate_staged_run_logs_main_audit_section_should_pass_when_section_exists(self) -> None:
        self._write_run_log(
            "# ISSUE-783\n\n"
            "- Issue: #783\n"
            "- Branch: task/783-local-precheck\n"
            "- PR: https://github.com/Leeky1017/CreoNow/pull/999\n\n"
            "## Main Session Audit\n"
            "- Audit-Owner: main-session\n"
        )

        agent_pr_preflight.validate_staged_run_logs_main_audit_section(
            self.repo,
            {self.run_log_rel},
        )

    def test_validate_staged_run_logs_main_audit_section_should_fail_when_section_missing(self) -> None:
        self._write_run_log(
            "# ISSUE-783\n\n"
            "- Issue: #783\n"
            "- Branch: task/783-local-precheck\n"
            "- PR: https://github.com/Leeky1017/CreoNow/pull/999\n"
        )

        with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\].*missing required section"):
            agent_pr_preflight.validate_staged_run_logs_main_audit_section(
                self.repo,
                {self.run_log_rel},
            )

    def test_validate_staged_run_logs_main_audit_section_should_skip_when_no_run_log_files(self) -> None:
        agent_pr_preflight.validate_staged_run_logs_main_audit_section(
            self.repo,
            {"docs/delivery-skill.md"},
        )


class MainSessionAuditSignatureCommitTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = "/tmp/repo"
        self.run_log = os.path.join(self.repo, "openspec", "_ops", "task_runs", "ISSUE-518.md")

    def test_validate_main_session_audit_signature_commit_should_pass_when_only_run_log_changed(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, "openspec/_ops/task_runs/ISSUE-518.md\n"),
        ):
            agent_pr_preflight.validate_main_session_audit_signature_commit(self.repo, self.run_log)

    def test_validate_main_session_audit_signature_commit_should_fail_when_run_log_not_changed(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, "scripts/agent_pr_preflight.py\n"),
        ):
            with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\].*must include RUN_LOG update"):
                agent_pr_preflight.validate_main_session_audit_signature_commit(self.repo, self.run_log)

    def test_validate_main_session_audit_signature_commit_should_fail_when_other_files_changed(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(
                0,
                "openspec/_ops/task_runs/ISSUE-518.md\nscripts/agent_pr_preflight.py\n",
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\].*only change RUN_LOG"):
                agent_pr_preflight.validate_main_session_audit_signature_commit(self.repo, self.run_log)

    def test_validate_main_session_audit_signature_commit_should_fail_on_git_diff_error(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(1, "fatal: bad revision"),
        ):
            with self.assertRaisesRegex(RuntimeError, r"^\[MAIN_AUDIT\].*failed to inspect signing commit diff"):
                agent_pr_preflight.validate_main_session_audit_signature_commit(self.repo, self.run_log)


class PreflightArgsTests(unittest.TestCase):
    def test_parse_args_defaults_to_full_mode(self) -> None:
        args = agent_pr_preflight.parse_args([])
        self.assertEqual("full", args.mode)

    def test_parse_args_accepts_fast_mode(self) -> None:
        args = agent_pr_preflight.parse_args(["--mode", "fast"])
        self.assertEqual("fast", args.mode)

    def test_parse_args_accepts_commit_mode(self) -> None:
        args = agent_pr_preflight.parse_args(["--mode", "commit"])
        self.assertEqual("commit", args.mode)


class CommitModeFlowTests(unittest.TestCase):
    def test_main_should_skip_commit_mode_when_branch_is_not_task(self) -> None:
        with mock.patch.object(agent_pr_preflight, "git_root", return_value="/tmp/repo"), mock.patch.object(
            agent_pr_preflight,
            "current_branch",
            return_value="amano/issue-783-local-preflight",
        ), mock.patch.object(agent_pr_preflight, "collect_staged_files") as collect_staged:
            rc = agent_pr_preflight.main(["--mode", "commit"])

        self.assertEqual(0, rc)
        collect_staged.assert_not_called()

    def test_main_should_run_commit_mode_guards_on_task_branch(self) -> None:
        staged_files = {"docs/delivery-skill.md", "openspec/_ops/task_runs/ISSUE-783.md"}
        with mock.patch.object(agent_pr_preflight, "git_root", return_value="/tmp/repo"), mock.patch.object(
            agent_pr_preflight,
            "current_branch",
            return_value="task/783-local-preflight",
        ), mock.patch.object(
            agent_pr_preflight,
            "collect_staged_files",
            return_value=staged_files,
        ), mock.patch.object(agent_pr_preflight, "must_run") as must_run, mock.patch.object(
            agent_pr_preflight,
            "validate_staged_run_logs_main_audit_section",
        ) as validate_main_audit:
            rc = agent_pr_preflight.main(["--mode", "commit"])

        self.assertEqual(0, rc)
        must_run.assert_called_once_with(
            [
                "python3",
                "scripts/check_doc_timestamps.py",
                "--files",
                *sorted(staged_files),
            ],
            cwd="/tmp/repo",
        )
        validate_main_audit.assert_called_once_with("/tmp/repo", staged_files)


if __name__ == "__main__":
    unittest.main()
