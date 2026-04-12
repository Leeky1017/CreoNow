import io
import json
import os
import pathlib
import sys
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import agent_github_delivery  # noqa: E402
import agent_pr_preflight  # noqa: E402


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
        self.assertIn("## Invariant Checklist", body)
        self.assertIn("- [ ] INV-1 原稿保护", body)
        self.assertIn("- [ ] INV-10 错误不丢上下文", body)
        self.assertIn("## Validation Evidence", body)
        self.assertIn("## Visual Evidence", body)
        self.assertIn("### Embedded Screenshots", body)
        self.assertIn("### Storybook Artifact / Link", body)
        self.assertIn("N/A（非前端改动）", body)
        self.assertIn("## Risk & Rollback", body)
        self.assertIn("## 审计门禁", body)
        self.assertIn("**审计模型配置（1+1+1+Duck）：**", body)
        self.assertIn("- 工程：Claude Opus 4.6 (high)", body)
        self.assertIn("- [ ] 审计 3（GPT-5.4）：FINAL-VERDICT ___", body)
        self.assertIn("`pytest -q scripts/tests/test_agent_github_delivery.py`", body)

    def test_build_pr_body_should_pass_preflight_body_validation(self) -> None:
        body = agent_github_delivery.build_pr_body(
            issue_number="1005",
            summary="统一 Agent 的 GitHub 交付控制面。",
            user_impact="Agent 可自行完成 PR 与评论收口。",
            worst_case="不同环境下继续出现 PR 交付半途而废。",
            verification_commands=["pytest -q scripts/tests/test_agent_github_delivery.py"],
            rollback_ref="git revert HEAD",
        )
        pr = agent_pr_preflight.PullRequest(
            number=1005,
            body=body,
            url="https://github.com/Leeky1017/CreoNow/pull/1005",
        )
        agent_pr_preflight.validate_pr_body_format(pr, "1005")

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
    @staticmethod
    def _consolidated_comment(
        *,
        head: str | None = None,
        seat3_extra: str | None = None,
        seat3_verdict: str = "ACCEPT",
        reviewer_verdict: str = "ACCEPT",
    ) -> str:
        lines = [
            "## 审计汇总",
            "",
        ]
        lines.extend(
            [
                "### 审计 1（Claude Opus 4.6 high）",
                "zero findings",
                "FINAL-VERDICT: ACCEPT",
                "",
                "### 审计 2（Claude Sonnet 4.6 high）",
                "zero findings",
                "FINAL-VERDICT: ACCEPT",
                "",
                "### 审计 3（GPT-5.4 xhigh）",
                "zero findings",
                f"FINAL-VERDICT: {seat3_verdict}",
            ]
        )
        if seat3_extra:
            lines.extend(["", seat3_extra])
        lines.extend(["", "## 审计元信息"])
        if head is not None:
            lines.append(f"**审计 HEAD**：`{head}`")
        lines.append(f"**FINAL-VERDICT**: {reviewer_verdict}")
        return "\n".join(lines)

    def test_audit_pass_should_fail_with_only_one_individual_audit_comment(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                "## FINAL-VERDICT：Issue #1005\n\nzero findings\n\n### 最终判定：ACCEPT",
            ]
        )

        self.assertFalse(evaluation.audit_pass)
        self.assertEqual(0, evaluation.matching_comments)
        self.assertEqual(0, evaluation.distinct_authors)
        self.assertFalse(evaluation.author_check_enforced)

    def test_audit_pass_should_pass_with_one_consolidated_reviewer_comment(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                self._consolidated_comment(),
            ]
        )

        self.assertTrue(evaluation.audit_pass)
        self.assertEqual(1, evaluation.matching_comments)
        self.assertEqual(0, evaluation.distinct_authors)
        self.assertFalse(evaluation.author_check_enforced)

    def test_audit_pass_should_pass_with_one_consolidated_reviewer_comment_from_named_author(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": self._consolidated_comment(),
                    "author": "reviewer-agent",
                },
            ],
            trusted_reviewers=["reviewer-agent"],
        )

        self.assertTrue(evaluation.audit_pass)
        self.assertEqual(1, evaluation.matching_comments)
        self.assertEqual(1, evaluation.distinct_authors)
        self.assertTrue(evaluation.author_check_enforced)
        self.assertTrue(evaluation.trusted_reviewer_check_enforced)
        self.assertEqual(1, evaluation.matching_trusted_authors)

    def test_audit_pass_should_fail_for_named_author_when_not_in_trusted_reviewer_list(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": self._consolidated_comment(),
                    "author": "random-engineer",
                },
            ],
            trusted_reviewers=["reviewer-agent"],
        )

        self.assertFalse(evaluation.audit_pass)
        self.assertEqual(1, evaluation.matching_comments)
        self.assertEqual(1, evaluation.distinct_authors)
        self.assertTrue(evaluation.author_check_enforced)
        self.assertTrue(evaluation.trusted_reviewer_check_enforced)
        self.assertEqual(0, evaluation.matching_trusted_authors)

    def test_audit_pass_should_fail_for_forged_authored_comment_without_trusted_reviewer_config(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": self._consolidated_comment(head="abc1234"),
                    "author": "random-outsider",
                },
            ],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)
        self.assertTrue(evaluation.author_check_enforced)
        self.assertFalse(evaluation.trusted_reviewer_check_enforced)
        self.assertTrue(evaluation.head_check_enforced)

    def test_audit_pass_should_fail_when_consolidated_comment_is_missing_a_seat(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": "\n".join(
                        [
                            "## 审计汇总",
                            "",
                            "### 审计 1（Claude Opus 4.6 high）",
                            "zero findings",
                            "FINAL-VERDICT: ACCEPT",
                            "",
                            "### 审计 2（Claude Sonnet 4.6 high）",
                            "zero findings",
                            "FINAL-VERDICT: ACCEPT",
                        ]
                    ),
                    "author": "reviewer-agent",
                },
            ]
        )

        self.assertFalse(evaluation.audit_pass)
        self.assertEqual(0, evaluation.matching_comments)
        self.assertEqual(0, evaluation.distinct_authors)
        self.assertTrue(evaluation.author_check_enforced)

    def test_audit_pass_should_pass_when_policy_text_mentions_reject_or_suggestion(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": self._consolidated_comment(
                        seat3_extra="policy quote: non-blocking / suggestion / nit 即 REJECT"
                    ),
                    "author": "reviewer-agent",
                },
            ],
            trusted_reviewers=["reviewer-agent"],
        )

        self.assertTrue(evaluation.audit_pass)
        self.assertEqual(1, evaluation.matching_comments)
        self.assertEqual(1, evaluation.distinct_authors)
        self.assertTrue(evaluation.author_check_enforced)

    def test_audit_pass_should_fail_when_any_audit_seat_reports_reject(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": self._consolidated_comment(seat3_verdict="REJECT"),
                    "author": "reviewer-agent",
                }
            ]
        )
        self.assertFalse(evaluation.audit_pass)

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

    def test_audit_pass_cli_should_emit_four_counts(self) -> None:
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            exit_code = agent_github_delivery.main(
                [
                    "audit-pass",
                    "--comments-json",
                    json.dumps(
                        [
                            {
                                "body": self._consolidated_comment(head="abc1234"),
                                "author": "reviewer-agent",
                            },
                        ]
                    ),
                    "--trusted-reviewer",
                    "reviewer-agent",
                    "--expected-head-sha",
                    "abc1234567890",
                ]
            )

        payload = json.loads(stdout.getvalue())
        self.assertEqual(0, exit_code)
        self.assertTrue(payload["audit_pass"])
        self.assertEqual(1, payload["matching_comments"])
        self.assertEqual(1, payload["distinct_authors"])
        self.assertTrue(payload["author_check_enforced"])
        self.assertTrue(payload["trusted_reviewer_check_enforced"])
        self.assertEqual(1, payload["matching_trusted_authors"])
        self.assertTrue(payload["head_check_enforced"])
        self.assertEqual(1, payload["matching_head_comments"])

    def test_audit_pass_should_fail_when_expected_head_does_not_match_comment_head(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": self._consolidated_comment(head="deadbeef"), "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)
        self.assertTrue(evaluation.head_check_enforced)
        self.assertEqual(0, evaluation.matching_head_comments)

    def test_audit_pass_should_fail_when_expected_head_missing_from_comment(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": self._consolidated_comment(), "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)
        self.assertTrue(evaluation.head_check_enforced)
        self.assertEqual(0, evaluation.matching_head_comments)

    def test_audit_pass_should_fail_when_trusted_and_head_match_different_comments(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {"body": self._consolidated_comment(head="deadbeef"), "author": "reviewer-agent"},
                {"body": self._consolidated_comment(head="abc1234"), "author": "random-engineer"},
            ],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)
        self.assertEqual(2, evaluation.matching_comments)
        self.assertEqual(1, evaluation.matching_trusted_authors)
        self.assertEqual(1, evaluation.matching_head_comments)

    def test_audit_pass_should_allow_policy_quote_line_with_reject_when_verdict_line_is_accept(self) -> None:
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [
                {
                    "body": self._consolidated_comment(
                        seat3_extra="Per protocol: any finding means FINAL-VERDICT: REJECT; this round stays zero findings."
                    ),
                    "author": "reviewer-agent",
                }
            ],
            trusted_reviewers=["reviewer-agent"],
        )
        self.assertTrue(evaluation.audit_pass)

    def test_audit_pass_should_ignore_reject_example_inside_fenced_code_block(self) -> None:
        body = """## 审计汇总
### 审计 1（Claude Opus 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 2（Claude Sonnet 4.6 high）
zero findings
```text
FINAL-VERDICT: REJECT
```
FINAL-VERDICT: ACCEPT
### 审计 3（GPT-5.4 xhigh）
zero findings
FINAL-VERDICT: ACCEPT
## 审计元信息
**审计 HEAD**：`abc1234`
**FINAL-VERDICT**: ACCEPT
"""
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": body, "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertTrue(evaluation.audit_pass)

    def test_audit_pass_should_fail_when_duplicate_seat_header_attempts_overwrite(self) -> None:
        body = """## 审计汇总
### 审计 1（Claude Opus 4.6 high）
zero findings
FINAL-VERDICT: REJECT
### 审计 1（Claude Opus 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 2（Claude Sonnet 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 3（GPT-5.4 xhigh）
zero findings
FINAL-VERDICT: ACCEPT
**审计 HEAD**：`abc1234`
**FINAL-VERDICT**: ACCEPT
"""
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": body, "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)

    def test_audit_pass_should_fail_when_global_summary_tries_to_satisfy_seat3(self) -> None:
        body = """## 审计汇总
### 审计 1（Claude Opus 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 2（Claude Sonnet 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 3（GPT-5.4 xhigh）
zero findings
## Summary
Seat 3 is pending.
**FINAL-VERDICT**: ACCEPT
**审计 HEAD**：`abc1234`
"""
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": body, "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)

    def test_audit_pass_should_fail_when_trailing_plain_final_verdict_appears_before_metadata_section(self) -> None:
        body = """## 审计汇总
### 审计 1（Claude Opus 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 2（Claude Sonnet 4.6 high）
zero findings
FINAL-VERDICT: ACCEPT
### 审计 3（GPT-5.4 xhigh）
zero findings
FINAL-VERDICT: ACCEPT
Summary line
FINAL-VERDICT: ACCEPT
**审计 HEAD**：`abc1234`
**FINAL-VERDICT**: ACCEPT
"""
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": body, "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertFalse(evaluation.audit_pass)

    def test_build_blocker_comment_should_explain_audit_requirement(self) -> None:
        body = agent_github_delivery.build_blocker_comment(
            kind="audit-required",
            pr_url="https://github.com/Leeky1017/CreoNow/pull/1006",
        )
        self.assertIn("Reviewer", body)
        self.assertIn("consolidated", body)
        self.assertIn("FINAL-VERDICT", body)
        self.assertIn("ACCEPT", body)
        self.assertIn("zero-findings", body)
        self.assertIn("https://github.com/Leeky1017/CreoNow/pull/1006", body)


class ReviewerTemplateGateDriftTests(unittest.TestCase):
    """Cross-validation: gate constants must stay in sync with the actual reviewer template file on disk."""

    _TEMPLATE_PATH = (
        pathlib.Path(__file__).resolve().parents[2]
        / ".github"
        / "agents"
        / "creonow-reviewer.agent.md"
    )

    @classmethod
    def _read_template(cls) -> str:
        return cls._TEMPLATE_PATH.read_text(encoding="utf-8")

    @classmethod
    def _extract_template_code_block(cls) -> str:
        """Extract the markdown code block from the reviewer template (between ```markdown and ```)."""
        template = cls._read_template()
        in_block = False
        lines: list[str] = []
        for line in template.splitlines():
            if not in_block and line.strip().startswith("```markdown"):
                in_block = True
                continue
            if in_block:
                if line.strip() == "```":
                    break
                lines.append(line)
        if not lines:
            raise AssertionError(
                f"No ```markdown code block found in {cls._TEMPLATE_PATH}"
            )
        return "\n".join(lines)

    @staticmethod
    def _build_comment_from_extracted_headers(
        headers: list[str],
        metadata_header: str,
        *,
        head_sha: str = "abc1234",
        reviewer_verdict: str = "ACCEPT",
    ) -> str:
        """Build a consolidated comment using headers extracted from the actual template file."""
        seat_body = "zero findings\nFINAL-VERDICT: ACCEPT"
        lines = [
            "## 🔍 1+1+1+Duck Audit Consolidation — PR #999",
            "",
        ]
        for header in headers:
            lines.extend([header, seat_body, ""])
        lines.append(metadata_header)
        lines.append(f"**审计 HEAD**：`{head_sha}`")
        lines.append(f"**FINAL-VERDICT**: {reviewer_verdict}")
        return "\n".join(lines)

    # --- Tests that read the actual file ---

    def test_template_file_exists(self) -> None:
        self.assertTrue(
            self._TEMPLATE_PATH.exists(),
            f"Reviewer template file must exist at {self._TEMPLATE_PATH}",
        )

    def test_section_headers_constants_appear_in_template_file(self) -> None:
        """Each CONSOLIDATED_AUDIT_SECTION_HEADERS constant must appear in the actual template."""
        template = self._read_template()
        for header in agent_github_delivery.CONSOLIDATED_AUDIT_SECTION_HEADERS:
            self.assertIn(
                header,
                template,
                f"Gate constant header {header!r} not found in {self._TEMPLATE_PATH.name}",
            )

    def test_metadata_header_constant_appears_in_template_file(self) -> None:
        """CONSOLIDATED_AUDIT_METADATA_HEADER must appear in the actual template."""
        template = self._read_template()
        self.assertIn(
            agent_github_delivery.CONSOLIDATED_AUDIT_METADATA_HEADER,
            template,
            f"Gate constant metadata header not found in {self._TEMPLATE_PATH.name}",
        )

    def test_comment_from_actual_template_passes_consolidated_gate(self) -> None:
        """Build a comment using headers extracted from the real file and verify it passes the gate."""
        code_block = self._extract_template_code_block()
        # Extract ### headers from the code block (seat section headers)
        extracted_headers = [
            line for line in code_block.splitlines() if line.startswith("### ")
        ]
        # Extract ## headers (metadata header)
        extracted_meta = [
            line for line in code_block.splitlines() if line.startswith("## ") and not line.startswith("### ")
        ]
        # The last ## header in the block should be the metadata header
        self.assertTrue(len(extracted_meta) >= 1, "Expected at least one ## header in template code block")
        metadata_header = extracted_meta[-1]

        body = self._build_comment_from_extracted_headers(
            extracted_headers, metadata_header
        )
        self.assertTrue(
            agent_github_delivery._is_consolidated_reviewer_audit_comment(body),
            "Comment built from actual template file headers must pass _is_consolidated_reviewer_audit_comment()",
        )

    def test_comment_from_actual_template_passes_evaluate_audit_pass(self) -> None:
        """Build a comment using headers extracted from the real file and verify it passes evaluation."""
        code_block = self._extract_template_code_block()
        extracted_headers = [
            line for line in code_block.splitlines() if line.startswith("### ")
        ]
        extracted_meta = [
            line for line in code_block.splitlines() if line.startswith("## ") and not line.startswith("### ")
        ]
        self.assertTrue(len(extracted_meta) >= 1)
        metadata_header = extracted_meta[-1]

        body = self._build_comment_from_extracted_headers(
            extracted_headers, metadata_header, head_sha="abc1234"
        )
        evaluation = agent_github_delivery.evaluate_audit_pass_comments(
            [{"body": body, "author": "reviewer-agent"}],
            trusted_reviewers=["reviewer-agent"],
            expected_head_sha="abc1234567890",
        )
        self.assertTrue(evaluation.audit_pass)
        self.assertEqual(1, evaluation.matching_comments)
        self.assertEqual(1, evaluation.matching_trusted_authors)
        self.assertEqual(1, evaluation.matching_head_comments)


if __name__ == "__main__":
    unittest.main()
