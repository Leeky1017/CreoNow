#!/usr/bin/env python3
"""Helpers for agent GitHub delivery control-plane selection and templates."""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from collections.abc import Callable, Mapping, Sequence
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class CmdResult:
    code: int
    out: str


@dataclass(frozen=True)
class DeliveryCapabilities:
    override: str
    gh_installed: bool
    gh_authenticated: bool
    mcp_available: bool
    mcp_write_capable: bool
    selected_channel: str
    blocker: str | None
    reason: str


@dataclass(frozen=True)
class AuditComment:
    body: str
    author: str | None = None


@dataclass(frozen=True)
class AuditPassEvaluation:
    audit_pass: bool
    matching_comments: int
    distinct_authors: int
    author_check_enforced: bool
    trusted_reviewer_check_enforced: bool
    matching_trusted_authors: int
    head_check_enforced: bool
    matching_head_comments: int


TRUTHY = {"1", "true", "yes", "on"}
DEFAULT_VERIFICATION_COMMANDS = (
    "pnpm typecheck",
    "pnpm contract:check",
    "pnpm test:unit",
)
DEFAULT_ADDITIONAL_VALIDATION_NOTE = "Pending: add any extra local or CI evidence here."
DEFAULT_TEST_COVERAGE_NOTE = "Pending: summarize the tests added or updated for this change."
DEFAULT_NON_FRONTEND_VISUAL = "N/A（非前端改动）"
DEFAULT_FRONTEND_SCREENSHOT_PLACEHOLDER = "<!-- TODO: embed at least 1 screenshot here before requesting audit -->"
DEFAULT_FRONTEND_STORYBOOK_PLACEHOLDER = "TODO: add a clickable Storybook artifact or preview URL"
DEFAULT_FRONTEND_VISUAL_NOTE_PLACEHOLDER = "TODO: describe the states covered by visual acceptance"
DEFAULT_INVARIANT_CHECKLIST_LINES = (
    "- [ ] INV-1 原稿保护 — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-2 并发安全 — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-3 CJK Token — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-4 Memory-First — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-5 叙事压缩 — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-6 一切皆 Skill — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-7 统一入口 — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-8 Hook 链 — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-9 成本追踪 — TODO: 标注遵守 / 不涉及 / 违反+理由",
    "- [ ] INV-10 错误不丢上下文 — TODO: 标注遵守 / 不涉及 / 违反+理由",
)


CONSOLIDATED_AUDIT_SECTION_HEADERS = (
    "### 审计 1（GPT-5.4 xhigh）",
    "### 审计 2（GPT-5.3 Codex xhigh）",
    "### 审计 3（Claude Opus 4.6 high）",
    "### 审计 4（Claude Sonnet 4.6 high）",
)
CONSOLIDATED_AUDIT_METADATA_HEADER = "## 审计元信息"
SEAT_FINAL_VERDICT_ACCEPT_PATTERN = re.compile(
    r"(?im)^\s*(?:\*{0,2}\s*)?(?:FINAL-VERDICT|最终判定)(?:\s*\*{0,2})?\s*[:：]\s*ACCEPT\b"
)
SEAT_FINAL_VERDICT_REJECT_LINE_PATTERN = re.compile(
    r"(?im)^\s*(?:\*{0,2}\s*)?(?:FINAL-VERDICT|最终判定)(?:\s*\*{0,2})?\s*[:：]\s*REJECT\b"
)
SEAT_ZERO_FINDINGS_PATTERN = re.compile(r"(?i)\bzero(?:\s+|-)findings\b")
AUDIT_HEAD_CAPTURE_PATTERN = re.compile(r"审计 HEAD[^0-9a-fA-F`]{0,40}`?([0-9a-fA-F]{7,40})`?", re.IGNORECASE)
FENCED_CODE_BLOCK_PATTERN = re.compile(r"(?ms)^[ \t]*(```|~~~)[^\n]*\n.*?^[ \t]*\1[^\n]*(?:\n|$)")
REVIEWER_FINAL_VERDICT_ACCEPT_PATTERN = re.compile(r"(?im)^\s*\*\*FINAL-VERDICT\*\*\s*[:：]\s*ACCEPT\b")
REVIEWER_FINAL_VERDICT_REJECT_PATTERN = re.compile(r"(?im)^\s*\*\*FINAL-VERDICT\*\*\s*[:：]\s*REJECT\b")


def run(cmd: Sequence[str], *, cwd: str | None = None) -> CmdResult:
    proc = subprocess.run(
        list(cmd),
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    return CmdResult(code=proc.returncode, out=proc.stdout)


def parse_env_bool(env: Mapping[str, str], key: str) -> bool:
    value = env.get(key, "")
    return value.strip().lower() in TRUTHY


def detect_gh_installed(which: Callable[[str], str | None] = shutil.which) -> bool:
    return which("gh") is not None


def detect_gh_authenticated(
    *,
    repo_root: str | None = None,
    run_command: Callable[[Sequence[str]], CmdResult] | None = None,
) -> bool:
    if run_command is None:
        def _run(cmd: Sequence[str]) -> CmdResult:
            return run(cmd, cwd=repo_root)
        run_command = _run
    result = run_command(("gh", "auth", "status"))
    return result.code == 0


def select_channel(
    *,
    override: str,
    gh_installed: bool,
    gh_authenticated: bool,
    mcp_available: bool,
    mcp_write_capable: bool,
) -> DeliveryCapabilities:
    normalized_override = override.lower()

    if normalized_override == "gh":
        if not gh_installed:
            return DeliveryCapabilities(
                override=normalized_override,
                gh_installed=gh_installed,
                gh_authenticated=gh_authenticated,
                mcp_available=mcp_available,
                mcp_write_capable=mcp_write_capable,
                selected_channel="none",
                blocker="missing_tool",
                reason="`gh` 未安装，无法按强制 gh 通道执行。",
            )
        if not gh_authenticated:
            return DeliveryCapabilities(
                override=normalized_override,
                gh_installed=gh_installed,
                gh_authenticated=gh_authenticated,
                mcp_available=mcp_available,
                mcp_write_capable=mcp_write_capable,
                selected_channel="none",
                blocker="missing_auth",
                reason="`gh` 已安装但未认证，无法按强制 gh 通道执行。",
            )
        return DeliveryCapabilities(
            override=normalized_override,
            gh_installed=gh_installed,
            gh_authenticated=gh_authenticated,
            mcp_available=mcp_available,
            mcp_write_capable=mcp_write_capable,
            selected_channel="gh",
            blocker=None,
            reason="`gh` 已安装且已认证。",
        )

    if normalized_override == "mcp":
        if not mcp_available:
            return DeliveryCapabilities(
                override=normalized_override,
                gh_installed=gh_installed,
                gh_authenticated=gh_authenticated,
                mcp_available=mcp_available,
                mcp_write_capable=mcp_write_capable,
                selected_channel="none",
                blocker="missing_tool",
                reason="当前会话未暴露 GitHub MCP 能力。",
            )
        if not mcp_write_capable:
            return DeliveryCapabilities(
                override=normalized_override,
                gh_installed=gh_installed,
                gh_authenticated=gh_authenticated,
                mcp_available=mcp_available,
                mcp_write_capable=mcp_write_capable,
                selected_channel="none",
                blocker="missing_permission",
                reason="GitHub MCP 可见但不具备写权限。",
            )
        return DeliveryCapabilities(
            override=normalized_override,
            gh_installed=gh_installed,
            gh_authenticated=gh_authenticated,
            mcp_available=mcp_available,
            mcp_write_capable=mcp_write_capable,
            selected_channel="mcp",
            blocker=None,
            reason="按要求强制使用 GitHub MCP 通道。",
        )

    if normalized_override == "none":
        return DeliveryCapabilities(
            override=normalized_override,
            gh_installed=gh_installed,
            gh_authenticated=gh_authenticated,
            mcp_available=mcp_available,
            mcp_write_capable=mcp_write_capable,
            selected_channel="none",
            blocker="missing_tool",
            reason="显式关闭 GitHub 交付通道。",
        )

    if gh_installed and gh_authenticated:
        return DeliveryCapabilities(
            override="auto",
            gh_installed=gh_installed,
            gh_authenticated=gh_authenticated,
            mcp_available=mcp_available,
            mcp_write_capable=mcp_write_capable,
            selected_channel="gh",
            blocker=None,
            reason="auto 模式下优先选择已就绪的 `gh`。",
        )

    if mcp_available and mcp_write_capable:
        fallback_reason = "auto 模式下 `gh` 不可用，回退到 GitHub MCP。"
        if gh_installed and not gh_authenticated:
            fallback_reason = "auto 模式下 `gh` 未认证，回退到 GitHub MCP。"
        return DeliveryCapabilities(
            override="auto",
            gh_installed=gh_installed,
            gh_authenticated=gh_authenticated,
            mcp_available=mcp_available,
            mcp_write_capable=mcp_write_capable,
            selected_channel="mcp",
            blocker=None,
            reason=fallback_reason,
        )

    blocker = "missing_tool"
    reason = "`gh` 未安装，且无 GitHub MCP 写通道。"
    if gh_installed and not gh_authenticated:
        blocker = "missing_auth"
        reason = "`gh` 已安装但未认证，且无 GitHub MCP 写通道。"
    elif mcp_available and not mcp_write_capable:
        blocker = "missing_permission"
        reason = "GitHub MCP 可见但不具备写权限，同时 `gh` 不可用。"

    return DeliveryCapabilities(
        override="auto",
        gh_installed=gh_installed,
        gh_authenticated=gh_authenticated,
        mcp_available=mcp_available,
        mcp_write_capable=mcp_write_capable,
        selected_channel="none",
        blocker=blocker,
        reason=reason,
    )


def build_pr_title(title: str, issue_number: str) -> str:
    suffix = f"(#{issue_number})"
    stripped = title.strip()
    if suffix in stripped:
        return stripped
    return f"{stripped} {suffix}".strip()


def _normalize_optional_text(value: str | None, fallback: str) -> str:
    cleaned = (value or "").strip()
    return cleaned or fallback


def _normalize_multiline_block(values: Sequence[str] | None, fallback: str) -> str:
    cleaned = [value.strip() for value in values or () if value and value.strip()]
    if not cleaned:
        return fallback
    return "\n".join(cleaned)


def build_pr_body(
    *,
    issue_number: str,
    summary: str,
    user_impact: str,
    worst_case: str,
    verification_commands: Sequence[str],
    rollback_ref: str,
    skip_reason: str = "N/A (task branch)",
    recovery_note: str = "无",
    frontend_pr: bool = False,
    embedded_screenshots: Sequence[str] | None = None,
    storybook_link: str | None = None,
    visual_acceptance_note: str | None = None,
    invariant_checklist_lines: Sequence[str] | None = None,
    test_coverage: str = DEFAULT_TEST_COVERAGE_NOTE,
    additional_validation_note: str = DEFAULT_ADDITIONAL_VALIDATION_NOTE,
) -> str:
    verification_lines = [f"- [ ] `{command}`" for command in verification_commands]
    verification_block = "\n".join(verification_lines)
    has_visual_inputs = bool(
        (embedded_screenshots and any(item.strip() for item in embedded_screenshots))
        or (storybook_link and storybook_link.strip())
        or (visual_acceptance_note and visual_acceptance_note.strip())
    )
    is_frontend_pr = frontend_pr or has_visual_inputs

    if is_frontend_pr:
        screenshots_block = _normalize_multiline_block(
            embedded_screenshots,
            DEFAULT_FRONTEND_SCREENSHOT_PLACEHOLDER,
        )
        storybook_value = _normalize_optional_text(
            storybook_link,
            DEFAULT_FRONTEND_STORYBOOK_PLACEHOLDER,
        )
        visual_note_value = _normalize_optional_text(
            visual_acceptance_note,
            DEFAULT_FRONTEND_VISUAL_NOTE_PLACEHOLDER,
        )
        non_frontend_checkbox = "- [ ] N/A（非前端改动）"
    else:
        screenshots_block = DEFAULT_NON_FRONTEND_VISUAL
        storybook_value = DEFAULT_NON_FRONTEND_VISUAL
        visual_note_value = DEFAULT_NON_FRONTEND_VISUAL
        non_frontend_checkbox = "- [x] N/A（非前端改动）"
    invariant_checklist_block = _normalize_multiline_block(
        invariant_checklist_lines,
        "\n".join(DEFAULT_INVARIANT_CHECKLIST_LINES),
    )

    return f"""Skip-Reason: {skip_reason}

## Summary
- {summary}

Closes #{issue_number}

## Impact Scope
- {user_impact}

## Invariant Checklist
{invariant_checklist_block}

## Validation Evidence
{verification_block}
- Additional validation note: {_normalize_optional_text(additional_validation_note, DEFAULT_ADDITIONAL_VALIDATION_NOTE)}

## Visual Evidence

### Embedded Screenshots
{screenshots_block}

### Storybook Artifact / Link
- Link: {storybook_value}
- Visual acceptance note: {visual_note_value}

{non_frontend_checkbox}

## Test Coverage
- {_normalize_optional_text(test_coverage, DEFAULT_TEST_COVERAGE_NOTE)}

## Risk & Rollback
- Worst case if not fixed: {worst_case}
- Rollback ref: {rollback_ref}
- Recovery note: {recovery_note}

## 审计门禁

<!-- 以下由审计流程自动填写，PR 作者不要修改 -->

**审计模型配置：**
- 工程：GPT-5.3 Codex (xhigh)
- 审计 1：GPT-5.4 (xhigh)
- 审计 2：GPT-5.3 Codex (xhigh)
- 审计 3：Claude Opus 4.6 (high)
- 审计 4：Claude Sonnet 4.6 (high)
- 评论汇总：Claude Opus 4.6 (high)

- [ ] 审计 1（GPT-5.4）：FINAL-VERDICT ___
- [ ] 审计 2（GPT-5.3 Codex）：FINAL-VERDICT ___
- [ ] 审计 3（Claude Opus 4.6）：FINAL-VERDICT ___
- [ ] 审计 4（Claude Sonnet 4.6）：FINAL-VERDICT ___

<!-- 4 个都 ACCEPT 才可合并 -->
""".strip() + "\n"


def _extract_comment_author(raw_comment: Mapping[str, object]) -> str | None:
    raw_author = raw_comment.get("author")
    if isinstance(raw_author, str):
        cleaned = raw_author.strip()
        return cleaned or None
    if isinstance(raw_author, Mapping):
        for key in ("login", "name"):
            candidate = raw_author.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
    for key in ("login", "authorLogin"):
        candidate = raw_comment.get(key)
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return None


def _normalize_audit_comments(raw_comments: Sequence[object]) -> list[AuditComment]:
    normalized_comments: list[AuditComment] = []
    for raw_comment in raw_comments:
        if isinstance(raw_comment, str):
            normalized_comments.append(AuditComment(body=raw_comment))
            continue
        if isinstance(raw_comment, Mapping):
            body = raw_comment.get("body")
            if not isinstance(body, str):
                raise ValueError("comments-json comment objects must include a string `body` field")
            normalized_comments.append(
                AuditComment(body=body, author=_extract_comment_author(raw_comment))
            )
            continue
        raise ValueError("comments-json must be a JSON array of strings or {body, author} objects")
    return normalized_comments


def _extract_consolidated_audit_sections(body: str) -> dict[str, str]:
    lines = body.splitlines()
    known_headers = set(CONSOLIDATED_AUDIT_SECTION_HEADERS)
    header_indexes: dict[str, int] = {}
    ordered_headers: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped not in known_headers:
            continue
        if stripped in header_indexes:
            return {}
        header_indexes[stripped] = index
        ordered_headers.append((index, stripped))

    if len(header_indexes) != len(CONSOLIDATED_AUDIT_SECTION_HEADERS):
        return {}

    ordered_headers.sort(key=lambda item: item[0])
    if [header for _, header in ordered_headers] != list(CONSOLIDATED_AUDIT_SECTION_HEADERS):
        return {}

    metadata_indexes = [index for index, line in enumerate(lines) if line.strip() == CONSOLIDATED_AUDIT_METADATA_HEADER]
    if len(metadata_indexes) != 1:
        return {}
    trailer_start = metadata_indexes[0]
    if trailer_start <= ordered_headers[-1][0]:
        return {}

    sections: dict[str, str] = {}
    for seat_index, (start_index, header) in enumerate(ordered_headers):
        section_start = start_index + 1
        if seat_index + 1 < len(ordered_headers):
            section_end = ordered_headers[seat_index + 1][0]
        else:
            section_end = trailer_start
        sections[header] = "\n".join(lines[section_start:section_end])
    return sections


def _strip_fenced_code_blocks(text: str) -> str:
    return FENCED_CODE_BLOCK_PATTERN.sub("", text)


def _is_consolidated_reviewer_audit_comment(body: str) -> bool:
    sections = _extract_consolidated_audit_sections(body)
    if any(header not in sections for header in CONSOLIDATED_AUDIT_SECTION_HEADERS):
        return False
    for header in CONSOLIDATED_AUDIT_SECTION_HEADERS:
        seat_body = _strip_fenced_code_blocks(sections[header])
        if SEAT_FINAL_VERDICT_REJECT_LINE_PATTERN.search(seat_body):
            return False
        verdict_lines = SEAT_FINAL_VERDICT_ACCEPT_PATTERN.findall(seat_body)
        if not verdict_lines:
            return False
        if SEAT_ZERO_FINDINGS_PATTERN.search(seat_body) is None:
            return False
    metadata_index = body.find(CONSOLIDATED_AUDIT_METADATA_HEADER)
    if metadata_index < 0:
        return False
    metadata_body = body[metadata_index + len(CONSOLIDATED_AUDIT_METADATA_HEADER):]
    if REVIEWER_FINAL_VERDICT_REJECT_PATTERN.search(metadata_body):
        return False
    if REVIEWER_FINAL_VERDICT_ACCEPT_PATTERN.search(metadata_body) is None:
        return False
    return True


def _extract_audit_head_sha(body: str) -> str | None:
    match = AUDIT_HEAD_CAPTURE_PATTERN.search(body)
    if match is None:
        return None
    return match.group(1).lower()


def _head_matches_expected(comment_head: str, expected_head_sha: str) -> bool:
    comment_head_norm = comment_head.lower()
    expected_head_norm = expected_head_sha.lower()
    return expected_head_norm.startswith(comment_head_norm) or comment_head_norm.startswith(expected_head_norm)


def _normalize_trusted_reviewers(trusted_reviewers: Sequence[str] | None) -> set[str]:
    if trusted_reviewers is None:
        return set()
    normalized: set[str] = set()
    for reviewer in trusted_reviewers:
        if not isinstance(reviewer, str):
            continue
        name = reviewer.strip()
        if name:
            normalized.add(name.casefold())
    return normalized


def _trusted_reviewers_from_env(env: Mapping[str, str], key: str) -> list[str]:
    raw = env.get(key, "")
    if not raw.strip():
        return []
    return [candidate.strip() for candidate in raw.split(",") if candidate.strip()]


def evaluate_audit_pass_comments(
    raw_comments: Sequence[object],
    *,
    trusted_reviewers: Sequence[str] | None = None,
    expected_head_sha: str | None = None,
) -> AuditPassEvaluation:
    comments = _normalize_audit_comments(raw_comments)
    matching_comments = [
        comment
        for comment in comments
        if _is_consolidated_reviewer_audit_comment(comment.body)
    ]
    author_check_enforced = any(comment.author for comment in comments)
    distinct_authors = len({comment.author.casefold() for comment in matching_comments if comment.author})
    trusted_reviewer_set = _normalize_trusted_reviewers(trusted_reviewers)
    trusted_reviewer_check_enforced = bool(trusted_reviewer_set)
    matching_trusted_authors = len(
        {
            comment.author.casefold()
            for comment in matching_comments
            if comment.author and comment.author.casefold() in trusted_reviewer_set
        }
    )
    expected_head_norm = (expected_head_sha or "").strip().lower()
    head_check_enforced = bool(expected_head_norm)
    matching_head_comments = len(
        [
            comment
            for comment in matching_comments
            if (comment_head := _extract_audit_head_sha(comment.body))
            and _head_matches_expected(comment_head, expected_head_norm)
        ]
    )
    eligible_comments = [
        comment
        for comment in matching_comments
        if (
            (
                not trusted_reviewer_check_enforced
                or (comment.author and comment.author.casefold() in trusted_reviewer_set)
            )
            and (
                not head_check_enforced
                or (
                    (comment_head := _extract_audit_head_sha(comment.body))
                    and _head_matches_expected(comment_head, expected_head_norm)
                )
            )
        )
    ]

    if author_check_enforced and not trusted_reviewer_check_enforced:
        audit_pass = False
    elif matching_comments and not trusted_reviewer_check_enforced and not head_check_enforced:
        audit_pass = not author_check_enforced
    else:
        audit_pass = len(eligible_comments) >= 1

    return AuditPassEvaluation(
        audit_pass=audit_pass,
        matching_comments=len(matching_comments),
        distinct_authors=distinct_authors,
        author_check_enforced=author_check_enforced,
        trusted_reviewer_check_enforced=trusted_reviewer_check_enforced,
        matching_trusted_authors=matching_trusted_authors,
        head_check_enforced=head_check_enforced,
        matching_head_comments=matching_head_comments,
    )


def has_audit_pass_comment(comment_bodies: Sequence[object]) -> bool:
    return evaluate_audit_pass_comments(comment_bodies).audit_pass


def build_blocker_comment(
    *,
    kind: str,
    pr_url: str,
    merge_state: str | None = None,
    review_decision: str | None = None,
    timeout_seconds: int | None = None,
) -> str:
    normalized_kind = kind.lower()
    if normalized_kind == "review-required":
        return (
            "PR is blocked by `reviewDecision=REVIEW_REQUIRED`. "
            f"Complete independent review before merge. PR: {pr_url}"
        )
    if normalized_kind == "changes-requested":
        return (
            "PR is blocked by `reviewDecision=CHANGES_REQUESTED`; cannot auto-merge. "
            f"PR: {pr_url}"
        )
    if normalized_kind == "merge-conflicts":
        merge_state_value = merge_state or "DIRTY"
        return (
            f"PR is blocked by merge conflicts (`mergeStateStatus={merge_state_value}`). "
            f"Manual conflict resolution is required. PR: {pr_url}"
        )
    if normalized_kind == "merge-timeout":
        timeout_value = timeout_seconds if timeout_seconds is not None else 0
        review_value = review_decision or ""
        merge_value = merge_state or ""
        status_line = f"mergeState={merge_value} reviewDecision={review_value}".strip()
        return (
            "Auto-merge is enabled and checks are green, but the PR has not merged "
            f"after {timeout_value}s. Current status: {status_line}. PR: {pr_url}"
        )
    if normalized_kind == "audit-required":
        return (
            "Auto-merge remains disabled until the Reviewer posts one consolidated "
            "verbatim comment from a trusted reviewer account containing all four zero-findings `FINAL-VERDICT` audit reports "
            "with `ACCEPT`. "
            f"PR: {pr_url}"
        )
    raise ValueError(f"Unsupported blocker comment kind: {kind}")


def detect_capabilities_from_environment(
    *,
    override: str,
    env: Mapping[str, str] | None = None,
    which: Callable[[str], str | None] = shutil.which,
    run_command: Callable[[Sequence[str]], CmdResult] | None = None,
    repo_root: str | None = None,
) -> DeliveryCapabilities:
    current_env = os.environ if env is None else env
    gh_installed = detect_gh_installed(which)
    gh_authenticated = False
    if gh_installed:
        gh_authenticated = detect_gh_authenticated(repo_root=repo_root, run_command=run_command)
    mcp_available = parse_env_bool(current_env, "CODEX_GITHUB_MCP_AVAILABLE")
    mcp_write_capable = parse_env_bool(current_env, "CODEX_GITHUB_MCP_WRITE_CAPABLE")
    return select_channel(
        override=override,
        gh_installed=gh_installed,
        gh_authenticated=gh_authenticated,
        mcp_available=mcp_available,
        mcp_write_capable=mcp_write_capable,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="GitHub delivery helpers for agents.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    capabilities_parser = subparsers.add_parser("capabilities", help="Detect delivery channel.")
    capabilities_parser.add_argument(
        "--channel",
        default=os.environ.get("CODEX_GITHUB_CHANNEL", "auto"),
        choices=["auto", "gh", "mcp", "none"],
        help="Preferred GitHub delivery channel.",
    )

    pr_payload_parser = subparsers.add_parser("pr-payload", help="Build PR title/body payload.")
    pr_payload_parser.add_argument("--issue-number", required=True)
    pr_payload_parser.add_argument("--title", required=True)
    pr_payload_parser.add_argument("--summary", required=True)
    pr_payload_parser.add_argument("--user-impact", required=True)
    pr_payload_parser.add_argument("--worst-case", required=True)
    pr_payload_parser.add_argument("--rollback-ref", required=True)
    pr_payload_parser.add_argument(
        "--verification-command",
        action="append",
        dest="verification_commands",
        default=list(DEFAULT_VERIFICATION_COMMANDS),
        help="Repeatable verification command entry.",
    )
    pr_payload_parser.add_argument(
        "--skip-reason",
        default="N/A (task branch)",
    )
    pr_payload_parser.add_argument(
        "--recovery-note",
        default="无",
    )
    pr_payload_parser.add_argument(
        "--frontend-pr",
        action="store_true",
        default=parse_env_bool(os.environ, "AGENT_PR_FRONTEND"),
        help="Generate frontend visual evidence placeholders instead of N/A defaults.",
    )
    pr_payload_parser.add_argument(
        "--embedded-screenshot",
        action="append",
        dest="embedded_screenshots",
        help="Repeatable embedded screenshot markdown or HTML snippet.",
    )
    pr_payload_parser.add_argument(
        "--storybook-link",
        default=os.environ.get("AGENT_PR_STORYBOOK_LINK"),
    )
    pr_payload_parser.add_argument(
        "--visual-acceptance-note",
        default=os.environ.get("AGENT_PR_VISUAL_ACCEPTANCE_NOTE"),
    )
    pr_payload_parser.add_argument(
        "--test-coverage",
        default=os.environ.get("AGENT_PR_TEST_COVERAGE", DEFAULT_TEST_COVERAGE_NOTE),
    )
    pr_payload_parser.add_argument(
        "--additional-validation-note",
        default=os.environ.get(
            "AGENT_PR_ADDITIONAL_VALIDATION_NOTE",
            DEFAULT_ADDITIONAL_VALIDATION_NOTE,
        ),
    )

    audit_parser = subparsers.add_parser(
        "audit-pass",
        help="Check whether a Reviewer-consolidated zero-findings audit comment exists.",
    )
    audit_parser.add_argument(
        "--comments-json",
        required=True,
        help="JSON array of comment strings or {body, author} objects.",
    )
    audit_parser.add_argument(
        "--trusted-reviewer",
        action="append",
        dest="trusted_reviewers",
        help="Repeatable trusted reviewer login allowed to satisfy the consolidated gate.",
    )
    audit_parser.add_argument(
        "--trusted-reviewers-env",
        default="CODEX_AUDIT_TRUSTED_REVIEWERS",
        help="Environment variable that stores comma-separated trusted reviewer logins.",
    )
    audit_parser.add_argument(
        "--expected-head-sha",
        default=None,
        help="Expected PR HEAD SHA. Consolidated comment must contain matching `审计 HEAD` marker.",
    )

    comment_parser = subparsers.add_parser("comment-payload", help="Build blocker comment.")
    comment_parser.add_argument(
        "--kind",
        required=True,
        choices=["review-required", "changes-requested", "merge-conflicts", "merge-timeout", "audit-required"],
    )
    comment_parser.add_argument("--pr-url", required=True)
    comment_parser.add_argument("--merge-state", default=None)
    comment_parser.add_argument("--review-decision", default=None)
    comment_parser.add_argument("--timeout-seconds", type=int, default=None)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "capabilities":
        capabilities = detect_capabilities_from_environment(override=args.channel)
        print(json.dumps(asdict(capabilities), ensure_ascii=False, indent=2))
        return 0

    if args.command == "pr-payload":
        embedded_screenshots = list(args.embedded_screenshots or [])
        if not embedded_screenshots:
            raw_embedded_screenshots = os.environ.get("AGENT_PR_EMBEDDED_SCREENSHOTS", "").strip()
            if raw_embedded_screenshots:
                embedded_screenshots = [raw_embedded_screenshots]
        payload = {
            "title": build_pr_title(args.title, args.issue_number),
            "body": build_pr_body(
                issue_number=args.issue_number,
                summary=args.summary,
                user_impact=args.user_impact,
                worst_case=args.worst_case,
                verification_commands=args.verification_commands,
                rollback_ref=args.rollback_ref,
                skip_reason=args.skip_reason,
                recovery_note=args.recovery_note,
                frontend_pr=args.frontend_pr,
                embedded_screenshots=embedded_screenshots,
                storybook_link=args.storybook_link,
                visual_acceptance_note=args.visual_acceptance_note,
                test_coverage=args.test_coverage,
                additional_validation_note=args.additional_validation_note,
            ),
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if args.command == "audit-pass":
        comments = json.loads(args.comments_json)
        if not isinstance(comments, list):
            raise SystemExit("comments-json must be a JSON array of strings or {body, author} objects")
        trusted_reviewers = list(args.trusted_reviewers or [])
        if args.trusted_reviewers_env:
            trusted_reviewers.extend(_trusted_reviewers_from_env(os.environ, args.trusted_reviewers_env))
        try:
            evaluation = evaluate_audit_pass_comments(
                comments,
                trusted_reviewers=trusted_reviewers,
                expected_head_sha=args.expected_head_sha,
            )
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        print(json.dumps(asdict(evaluation), ensure_ascii=False, indent=2))
        return 0

    if args.command == "comment-payload":
        payload = {
            "body": build_blocker_comment(
                kind=args.kind,
                pr_url=args.pr_url,
                merge_state=args.merge_state,
                review_decision=args.review_decision,
                timeout_seconds=args.timeout_seconds,
            )
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
