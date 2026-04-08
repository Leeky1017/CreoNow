"""Tests for agent_pr_preflight.py delivery contract."""
import json
import os
import sys
import unittest
from unittest import mock
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import agent_pr_preflight  # noqa: E402
import agent_github_delivery  # noqa: E402


def make_pr_body(issue_number: str = "42", *, frontend: bool = False) -> str:
    kwargs = {
        "issue_number": issue_number,
        "summary": "Delivery script contract update.",
        "user_impact": "PR preflight and PR body generator stay aligned.",
        "worst_case": "stale delivery gates stay bypassable.",
        "verification_commands": ["pytest -q scripts/tests/test_agent_pr_preflight.py"],
        "rollback_ref": "git revert HEAD",
        "recovery_note": "none",
        "test_coverage": "Covers delivery script contract regressions.",
        "additional_validation_note": "local preflight contract verified.",
    }
    if frontend:
        kwargs.update(
            {
                "frontend_pr": True,
                "embedded_screenshots": ["![Renderer panel](https://example.com/screenshot.png)"],
                "storybook_link": "https://storybook.example.com/?path=/story/renderer-panel",
                "visual_acceptance_note": "Checked default, loading, and error states.",
            }
        )
    return agent_github_delivery.build_pr_body(**kwargs)


class WorktreeIsolationTests(unittest.TestCase):
    """Preflight must not run from controlplane root."""

    def test_ensure_isolated_worktree_should_fail_on_controlplane_root(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "controlplane_root",
            return_value="/tmp/repo",
        ):
            with self.assertRaisesRegex(RuntimeError, r"\[WORKTREE\].*isolated task worktree"):
                agent_pr_preflight.ensure_isolated_worktree("/tmp/repo")

    def test_ensure_isolated_worktree_should_pass_for_secondary_worktree(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "controlplane_root",
            return_value="/tmp/repo",
        ):
            agent_pr_preflight.ensure_isolated_worktree("/tmp/repo/.worktrees/issue-42-demo")


class BranchContractTests(unittest.TestCase):
    """Branch must be task/<N>-<slug>."""

    def test_main_should_fail_when_branch_is_not_task_format(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "git_root",
            return_value="/tmp/repo",
        ), mock.patch.object(
            agent_pr_preflight,
            "ensure_isolated_worktree"
        ), mock.patch.object(
            agent_pr_preflight,
            "current_branch",
            return_value="feature/some-branch",
        ):
            rc = agent_pr_preflight.main()
        self.assertEqual(1, rc)

    def test_main_should_fail_when_branch_has_uppercase_slug(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "git_root",
            return_value="/tmp/repo",
        ), mock.patch.object(
            agent_pr_preflight,
            "ensure_isolated_worktree"
        ), mock.patch.object(
            agent_pr_preflight,
            "current_branch",
            return_value="task/42-SomeFeature",
        ):
            rc = agent_pr_preflight.main()
        self.assertEqual(1, rc)

    def test_main_should_fail_when_branch_missing_issue_number(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "git_root",
            return_value="/tmp/repo",
        ), mock.patch.object(
            agent_pr_preflight,
            "ensure_isolated_worktree"
        ), mock.patch.object(
            agent_pr_preflight,
            "current_branch",
            return_value="task/no-number-slug",
        ):
            rc = agent_pr_preflight.main()
        self.assertEqual(1, rc)


class IssueStateTests(unittest.TestCase):
    """Issue must be OPEN."""

    def test_validate_issue_is_open_should_pass_when_open(self) -> None:
        payload = '{"number": 42, "state": "OPEN", "title": "test", "url": "https://example.com"}'
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, payload),
        ):
            agent_pr_preflight.validate_issue_is_open("/tmp/repo", "42")

    def test_validate_issue_is_open_should_fail_when_closed(self) -> None:
        payload = '{"number": 42, "state": "closed", "title": "test", "url": "https://example.com"}'
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, payload),
        ):
            with self.assertRaisesRegex(RuntimeError, r"\[ISSUE\].*CLOSED.*expected OPEN"):
                agent_pr_preflight.validate_issue_is_open("/tmp/repo", "42")

    def test_validate_issue_is_open_should_fail_when_gh_errors(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(1, "not found"),
        ):
            with self.assertRaisesRegex(RuntimeError, r"\[ISSUE\].*failed to query"):
                agent_pr_preflight.validate_issue_is_open("/tmp/repo", "99")


class PRBodyFormatTests(unittest.TestCase):
    """PR body must satisfy the tightened delivery contract."""

    def test_validate_pr_body_format_should_pass_with_non_frontend_na_visual_evidence(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body(),
            url="https://github.com/test/test/pull/100",
        )
        agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_pass_case_insensitive(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace("Closes #42", "closes #42", 1),
            url="https://github.com/test/test/pull/100",
        )
        agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_accept_fullwidth_colon_labels(self) -> None:
        body = make_pr_body().replace(
            "- [ ] 审计 1（GPT-5.4）：FINAL-VERDICT ___",
            "- [ ] 审计 1（GPT-5.4）: FINAL-VERDICT ___",
            1,
        ).replace(
            "- [ ] 审计 2（GPT-5.3 Codex）：FINAL-VERDICT ___",
            "- [ ] 审计 2（GPT-5.3 Codex）: FINAL-VERDICT ___",
            1,
        )
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=body,
            url="https://github.com/test/test/pull/100",
        )
        agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_pass_with_frontend_visual_evidence(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body(frontend=True),
            url="https://github.com/test/test/pull/100",
        )
        agent_pr_preflight.validate_pr_body_format(pr, "42", frontend_required=True)

    def test_validate_pr_body_format_should_accept_repository_template_audit_gate(self) -> None:
        template_path = Path(__file__).resolve().parents[2] / ".github" / "PULL_REQUEST_TEMPLATE.md"
        template_body = template_path.read_text(encoding="utf-8")
        invariant_section = agent_pr_preflight.extract_section(
            template_body,
            "阶段 B：Invariant Checklist",
            level=2,
        )
        self.assertIsNotNone(invariant_section)
        audit_gate_section = agent_pr_preflight.extract_section(template_body, "审计门禁", level=2)
        self.assertIsNotNone(audit_gate_section)
        body = (
            "## Summary\n- contract validation\n\n"
            "Closes #42\n\n"
            "## 阶段 B：Invariant Checklist\n"
            f"{invariant_section}\n\n"
            "## Validation Evidence\n- [x] `pytest -q scripts/tests/test_agent_pr_preflight.py`\n\n"
            "## Visual Evidence\n\n"
            "### Embedded Screenshots\nN/A（非前端改动）\n\n"
            "### Storybook Artifact / Link\n"
            "- Link: N/A（非前端改动）\n"
            "- Visual acceptance note: N/A（非前端改动）\n\n"
            "- [x] N/A（非前端改动）\n\n"
            "## Risk & Rollback\n- Rollback ref: git revert HEAD\n\n"
            "## 审计门禁\n"
            f"{audit_gate_section}\n"
        )
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=body,
            url="https://github.com/test/test/pull/100",
        )
        agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_frontend_marked_na(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body(frontend=False),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"frontend changes require screenshots"):
            agent_pr_preflight.validate_pr_body_format(pr, "42", frontend_required=True)

    def test_validate_pr_body_format_should_fail_without_closes(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace("Closes #42", "Refs #42", 1),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"\[PR\].*must contain.*Closes #42"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_with_blank_validation_evidence(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace(
                "- [ ] `pytest -q scripts/tests/test_agent_pr_preflight.py`\n- Additional validation note: local preflight contract verified.",
                "-",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"Validation Evidence"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_frontend_screenshot_is_missing(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body(frontend=True).replace(
                "![Renderer panel](https://example.com/screenshot.png)",
                "Screenshot pending upload",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"embed at least one screenshot image"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_frontend_storybook_link_is_missing(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body(frontend=True).replace(
                "https://storybook.example.com/?path=/story/renderer-panel",
                "pending",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"Storybook link"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_visual_acceptance_note_is_missing(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body(frontend=True).replace(
                "Checked default, loading, and error states.",
                "",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"Visual acceptance note"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_audit_model_line_is_missing(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace(
                "- 评论汇总：Claude Opus 4.6 (high)",
                "",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"must include fixed model line"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_audit_seat_checklist_is_missing(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace(
                "- [ ] 审计 4（Claude Sonnet 4.6）：FINAL-VERDICT ___",
                "",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"seat 4 FINAL-VERDICT checklist"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_audit_seat_lacks_final_verdict(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace(
                "- [ ] 审计 3（Claude Opus 4.6）：FINAL-VERDICT ___",
                "- [ ] 审计 3（Claude Opus 4.6）：PENDING",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"seat 3 FINAL-VERDICT checklist"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")

    def test_validate_pr_body_format_should_fail_when_invariant_checklist_is_missing(self) -> None:
        pr = agent_pr_preflight.PullRequest(
            number=100,
            body=make_pr_body().replace("## Invariant Checklist\n", "", 1).replace(
                "- [ ] INV-1 原稿保护 — TODO: 标注遵守 / 不涉及 / 违反+理由\n",
                "",
                1,
            ),
            url="https://github.com/test/test/pull/100",
        )
        with self.assertRaisesRegex(RuntimeError, r"Invariant Checklist"):
            agent_pr_preflight.validate_pr_body_format(pr, "42")


class QueryOpenPRTests(unittest.TestCase):
    """PR query should handle payloads correctly."""

    def test_query_open_pr_should_fail_when_no_pr_found(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, "[]"),
        ):
            with self.assertRaisesRegex(RuntimeError, r"\[PR\].*no open PR found"):
                agent_pr_preflight.query_open_pr_for_branch("/tmp/repo", "task/42-test")

    def test_query_open_pr_should_parse_valid_payload(self) -> None:
        payload = json.dumps(
            [{"number": 100, "body": make_pr_body(), "url": "https://github.com/test/pull/100"}]
        )
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, payload),
        ):
            pr = agent_pr_preflight.query_open_pr_for_branch("/tmp/repo", "task/42-test")
        self.assertEqual(100, pr.number)
        self.assertIn("Closes #42", pr.body)

    def test_query_open_pr_should_fail_on_invalid_json(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, "not json"),
        ):
            with self.assertRaisesRegex(RuntimeError, r"\[PR\].*invalid JSON"):
                agent_pr_preflight.query_open_pr_for_branch("/tmp/repo", "task/42-test")

    def test_query_open_pr_should_handle_null_body(self) -> None:
        payload = '[{"number": 100, "body": null, "url": "https://github.com/test/pull/100"}]'
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, payload),
        ):
            pr = agent_pr_preflight.query_open_pr_for_branch("/tmp/repo", "task/42-test")
        self.assertEqual("", pr.body)


class FrontendDetectionTests(unittest.TestCase):
    """Frontend change detection must fail closed on git diff errors."""

    def test_branch_touches_frontend_should_fail_when_git_diff_errors(self) -> None:
        with mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(1, "fatal: bad revision 'origin/main...HEAD'"),
        ):
            with self.assertRaisesRegex(RuntimeError, r"failed to detect frontend file changes"):
                agent_pr_preflight.branch_touches_frontend("/tmp/repo")


class EndToEndFlowTests(unittest.TestCase):
    """Full main() success and failure paths."""

    def _mock_valid_flow(self) -> tuple:
        issue_payload = '{"number": 42, "state": "OPEN", "title": "test", "url": "https://example.com"}'
        pr_payload = json.dumps(
            [{"number": 100, "body": make_pr_body(), "url": "https://github.com/test/pull/100"}]
        )

        git_root_mock = mock.patch.object(
            agent_pr_preflight, "git_root", return_value="/tmp/repo"
        )
        branch_mock = mock.patch.object(
            agent_pr_preflight, "current_branch", return_value="task/42-memory-decay"
        )

        def run_side_effect(cmd, *, cwd=None):
            if "issue" in cmd:
                return agent_pr_preflight.CmdResult(0, issue_payload)
            return agent_pr_preflight.CmdResult(0, pr_payload)

        run_mock = mock.patch.object(agent_pr_preflight, "run", side_effect=run_side_effect)
        worktree_mock = mock.patch.object(agent_pr_preflight, "ensure_isolated_worktree")
        frontend_mock = mock.patch.object(agent_pr_preflight, "branch_touches_frontend", return_value=False)
        return git_root_mock, branch_mock, run_mock, worktree_mock, frontend_mock

    def test_main_should_pass_with_valid_flow(self) -> None:
        gm, bm, rm, wm, fm = self._mock_valid_flow()
        with gm, bm, rm, wm, fm:
            rc = agent_pr_preflight.main()
        self.assertEqual(0, rc)

    def test_main_should_fail_when_issue_is_closed(self) -> None:
        closed_payload = '{"number": 42, "state": "closed", "title": "test", "url": "https://example.com"}'
        with mock.patch.object(
            agent_pr_preflight, "git_root", return_value="/tmp/repo"
        ), mock.patch.object(
            agent_pr_preflight, "ensure_isolated_worktree"
        ), mock.patch.object(
            agent_pr_preflight, "current_branch", return_value="task/42-memory-decay"
        ), mock.patch.object(
            agent_pr_preflight,
            "run",
            return_value=agent_pr_preflight.CmdResult(0, closed_payload),
        ), mock.patch.object(
            agent_pr_preflight,
            "branch_touches_frontend",
            return_value=False,
        ):
            rc = agent_pr_preflight.main()
        self.assertEqual(1, rc)


if __name__ == "__main__":
    unittest.main()
