import io
import json
import os
import sys
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import agent_github_delivery  # noqa: E402


class ChannelSelectionTests(unittest.TestCase):
    def test_select_channel_should_prefer_gh_when_cli_is_ready(self) -> None:
        capabilities = agent_github_delivery.select_channel(
            override="auto",
            gh_installed=True,
            gh_authenticated=True,
            mcp_available=True,
            mcp_write_capable=True,
        )
        self.assertEqual("gh", capabilities.selected_channel)
        self.assertIsNone(capabilities.blocker)

    def test_select_channel_should_fallback_to_mcp_when_gh_missing(self) -> None:
        capabilities = agent_github_delivery.select_channel(
            override="auto",
            gh_installed=False,
            gh_authenticated=False,
            mcp_available=True,
            mcp_write_capable=True,
        )
        self.assertEqual("mcp", capabilities.selected_channel)
        self.assertIsNone(capabilities.blocker)

    def test_select_channel_should_report_missing_auth_when_no_fallback_exists(self) -> None:
        capabilities = agent_github_delivery.select_channel(
            override="auto",
            gh_installed=True,
            gh_authenticated=False,
            mcp_available=False,
            mcp_write_capable=False,
        )
        self.assertEqual("none", capabilities.selected_channel)
        self.assertEqual("missing_auth", capabilities.blocker)


class PullRequestTemplateTests(unittest.TestCase):
    def test_build_pr_title_should_append_issue_suffix_once(self) -> None:
        self.assertEqual(
            "Unify delivery control plane (#1005)",
            agent_github_delivery.build_pr_title("Unify delivery control plane", "1005"),
        )
        self.assertEqual(
            "Unify delivery control plane (#1005)",
            agent_github_delivery.build_pr_title("Unify delivery control plane (#1005)", "1005"),
        )

    def test_build_pr_body_should_follow_repository_contract(self) -> None:
        body = agent_github_delivery.build_pr_body(
            issue_number="1005",
            summary="统一 Agent 的 GitHub 交付控制面。",
            user_impact="Agent 可自行完成 PR 与评论收口。",
            worst_case="不同环境下继续出现 PR 交付半途而废。",
            verification_commands=["pytest -q scripts/tests/test_agent_github_delivery.py"],
            rollback_ref="git revert HEAD",
        )
        self.assertIn("Skip-Reason: N/A (task branch)", body)
        self.assertIn("Closes #1005", body)
        self.assertIn("## Validation Evidence", body)
        self.assertIn("## Visual Evidence", body)
        self.assertIn("### Embedded Screenshots", body)
        self.assertIn("### Storybook Artifact / Link", body)
        self.assertIn("N/A（非前端改动）", body)
        self.assertIn("## Risk & Rollback", body)
        self.assertIn("## Audit Gate", body)
        self.assertIn("`scripts/agent_pr_preflight.sh`", body)
        self.assertIn("Required checks", body)
        self.assertIn("`pytest -q scripts/tests/test_agent_github_delivery.py`", body)

    def test_build_pr_body_should_emit_frontend_placeholders_when_visual_inputs_are_missing(self) -> None:
        body = agent_github_delivery.build_pr_body(
            issue_number="1005",
            summary="统一 Agent 的 GitHub 交付控制面。",
            user_impact="Agent 可自行完成 PR 与评论收口。",
            worst_case="不同环境下继续出现 PR 交付半途而废。",
            verification_commands=["pytest -q scripts/tests/test_agent_github_delivery.py"],
            rollback_ref="git revert HEAD",
            frontend_pr=True,
        )

        self.assertIn("<!-- TODO: embed at least 1 screenshot here before requesting audit -->", body)
        self.assertIn("TODO: add a clickable Storybook artifact or preview URL", body)
        self.assertIn("TODO: describe the states covered by visual acceptance", body)
        self.assertIn("- [ ] N/A（非前端改动）", body)


class CommentTemplateTests(unittest.TestCase):
    def test_build_blocker_comment_should_include_status_and_pr_url(self) -> None:
        body = agent_github_delivery.build_blocker_comment(
            kind="review-required",
            pr_url="https://github.com/Leeky1017/CreoNow/pull/1006",
        )
        self.assertIn("reviewDecision=REVIEW_REQUIRED", body)
        self.assertIn("https://github.com/Leeky1017/CreoNow/pull/1006", body)


class AuditGateTests(unittest.TestCase):
    def test_audit_pass_should_fail_with_only_one_matching_comment(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                "## FINAL-VERDICT：Issue #1005\n\nzero findings\n\n### 最终判定：ACCEPT",
            ]
        )

        self.assertFalse(evaluation.audit_pass)
        self.assertEqual(1, evaluation.matching_comments)
        self.assertEqual(0, evaluation.distinct_authors)
        self.assertFalse(evaluation.author_check_enforced)

    def test_audit_pass_should_pass_with_two_matching_string_comments(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                "## FINAL-VERDICT：Issue #1005\n\nzero findings\n\n### 最终判定：ACCEPT",
                "## FINAL-VERDICT：Issue #1005\n\nzero findings\n\n### 最终判定：ACCEPT\n\nby second reviewer",
            ]
        )

        self.assertTrue(evaluation.audit_pass)
        self.assertEqual(2, evaluation.matching_comments)
        self.assertEqual(0, evaluation.distinct_authors)
        self.assertFalse(evaluation.author_check_enforced)

    def test_audit_pass_should_fail_with_two_matching_comments_from_same_author(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": "## FINAL-VERDICT\n\nzero findings\n\n### 最终判定：ACCEPT",
                    "author": "audit-agent-a",
                },
                {
                    "body": "## FINAL-VERDICT\n\nzero findings\n\n### 最终判定：ACCEPT",
                    "author": "audit-agent-a",
                },
            ]
        )

        self.assertFalse(evaluation.audit_pass)
        self.assertEqual(2, evaluation.matching_comments)
        self.assertEqual(1, evaluation.distinct_authors)
        self.assertTrue(evaluation.author_check_enforced)

    def test_audit_pass_should_pass_with_two_matching_comments_from_distinct_authors(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": "## FINAL-VERDICT\n\nzero findings\n\n### 最终判定：ACCEPT",
                    "author": "audit-agent-a",
                },
                {
                    "body": "## FINAL-VERDICT\n\nzero findings\n\n### 最终判定：ACCEPT",
                    "author": "audit-agent-b",
                },
            ]
        )

        self.assertTrue(evaluation.audit_pass)
        self.assertEqual(2, evaluation.matching_comments)
        self.assertEqual(2, evaluation.distinct_authors)
        self.assertTrue(evaluation.author_check_enforced)

    def test_audit_pass_should_fail_without_zero_findings_or_accept(self) -> None:
        self.assertFalse(
            agent_github_delivery.has_audit_pass_comment(
                [
                    "## FINAL-VERDICT：Issue #1005\n\n### 最终判定：ACCEPT",
                    "## FINAL-VERDICT：Issue #1005\n\nzero findings\n\n### 最终判定：REJECT",
                ]
            )
        )
        self.assertFalse(
            agent_github_delivery.has_audit_pass_comment(
                [
                    "## PRE-AUDIT：Issue #1005\n\nzero findings\n\n### 最终判定：ACCEPT",
                    "## FINAL-VERDICT：Issue #1005\n\nzero findings\n\n### 最终判定：REJECT",
                ]
            )
        )

    def test_audit_pass_cli_should_emit_counts(self) -> None:
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            exit_code = agent_github_delivery.main(
                [
                    "audit-pass",
                    "--comments-json",
                    json.dumps(
                        [
                            {
                                "body": "## FINAL-VERDICT\n\nzero findings\n\n### 最终判定：ACCEPT",
                                "author": "audit-agent-a",
                            },
                            {
                                "body": "## FINAL-VERDICT\n\nzero findings\n\n### 最终判定：ACCEPT",
                                "author": "audit-agent-b",
                            },
                        ]
                    ),
                ]
            )

        payload = json.loads(stdout.getvalue())
        self.assertEqual(0, exit_code)
        self.assertTrue(payload["audit_pass"])
        self.assertEqual(2, payload["matching_comments"])
        self.assertEqual(2, payload["distinct_authors"])
        self.assertTrue(payload["author_check_enforced"])

    def test_build_blocker_comment_should_explain_audit_requirement(self) -> None:
        body = agent_github_delivery.build_blocker_comment(
            kind="audit-required",
            pr_url="https://github.com/Leeky1017/CreoNow/pull/1006",
        )
        self.assertIn("two independent audit agents", body)
        self.assertIn("FINAL-VERDICT", body)
        self.assertIn("ACCEPT", body)
        self.assertIn("zero-findings", body)
        self.assertIn("https://github.com/Leeky1017/CreoNow/pull/1006", body)


if __name__ == "__main__":
    unittest.main()
