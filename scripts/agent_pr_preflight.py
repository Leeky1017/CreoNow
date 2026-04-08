#!/usr/bin/env python3
"""CreoNow PR preflight checks.

Validates the delivery contract below:
- Branch naming: task/<N>-<slug>
- Issue state: must be OPEN
- PR body: must contain the audit-ready delivery sections
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CmdResult:
    code: int
    out: str


@dataclass(frozen=True)
class PullRequest:
    number: int
    body: str
    url: str


HTML_COMMENT_PATTERN = re.compile(r"<!--[\s\S]*?-->", re.MULTILINE)
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)
IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\([^)]+\)|<img\b[^>]*>", re.IGNORECASE)
NA_VALUE_PATTERN = re.compile(r"(?i)^(?:-\s*\[[xX]\]\s*)?N/A(?:（[^）]+）|\([^)]+\))?$")
EMPTY_BULLET_PATTERN = re.compile(r"^-\s*$")
EMPTY_CHECKBOX_PATTERN = re.compile(r"^-\s*\[[ xX]\]\s*$")
EMPTY_LABEL_PATTERN = re.compile(r"^-\s*[^:：]+[:：]\s*$")
AUDIT_GATE_MODEL_LINES = (
    "- 工程：GPT-5.3 Codex (xhigh)",
    "- 审计 1：GPT-5.4 (xhigh)",
    "- 审计 2：GPT-5.3 Codex (xhigh)",
    "- 审计 3：Claude Opus 4.6 (high)",
    "- 审计 4：Claude Sonnet 4.6 (high)",
    "- 评论汇总：Claude Opus 4.6 (high)",
)
AUDIT_GATE_SEAT_PATTERNS = (
    re.compile(r"(?m)^-\s*\[[ xX]\]\s*审计 1（GPT-5\.4）[:：]\s*FINAL-VERDICT\b.+$"),
    re.compile(r"(?m)^-\s*\[[ xX]\]\s*审计 2（GPT-5\.3 Codex）[:：]\s*FINAL-VERDICT\b.+$"),
    re.compile(r"(?m)^-\s*\[[ xX]\]\s*审计 3（Claude Opus 4\.6）[:：]\s*FINAL-VERDICT\b.+$"),
    re.compile(r"(?m)^-\s*\[[ xX]\]\s*审计 4（Claude Sonnet 4\.6）[:：]\s*FINAL-VERDICT\b.+$"),
)
INVARIANT_IDS = tuple(f"INV-{index}" for index in range(1, 11))


def run(cmd: list[str], *, cwd: str | None = None) -> CmdResult:
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    return CmdResult(proc.returncode, proc.stdout)


def print_command_and_output(cmd: list[str], result: CmdResult) -> None:
    print(f"$ {' '.join(cmd)}")
    if result.out.strip():
        print(result.out.rstrip())


def git_root() -> str:
    cmd = ["git", "rev-parse", "--show-toplevel"]
    result = run(cmd)
    print_command_and_output(cmd, result)
    if result.code != 0:
        raise RuntimeError("[REPO] not a git repository")
    return result.out.strip()


def git_common_dir(repo_root: str) -> str:
    cmd = ["git", "rev-parse", "--git-common-dir"]
    result = run(cmd, cwd=repo_root)
    print_command_and_output(cmd, result)
    if result.code != 0:
        raise RuntimeError("[REPO] failed to get git common dir")
    return result.out.strip()


def controlplane_root(repo_root: str) -> str:
    common = git_common_dir(repo_root)
    return str((Path(repo_root) / common).resolve().parent)


def ensure_isolated_worktree(repo_root: str) -> None:
    cp_root = controlplane_root(repo_root)
    if Path(repo_root).resolve() == Path(cp_root).resolve():
        raise RuntimeError(
            f"[WORKTREE] run from an isolated task worktree, not controlplane root: {repo_root}"
        )


def current_branch(repo_root: str) -> str:
    cmd = ["git", "rev-parse", "--abbrev-ref", "HEAD"]
    result = run(cmd, cwd=repo_root)
    print_command_and_output(cmd, result)
    if result.code != 0:
        raise RuntimeError("[REPO] failed to get current branch")
    return result.out.strip()



def run_gh_json(repo: str, cmd: list[str], *, error_hint: str) -> object:
    result = run(cmd, cwd=repo)
    print_command_and_output(cmd, result)
    if result.code != 0:
        raise RuntimeError(error_hint)
    try:
        return json.loads(result.out)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{error_hint}; invalid JSON output: {exc}") from exc


def validate_issue_is_open(repo: str, issue_number: str) -> None:
    payload = run_gh_json(
        repo,
        ["gh", "issue", "view", issue_number, "--json", "number,state,title,url"],
        error_hint=f"[ISSUE] failed to query issue #{issue_number}",
    )
    state = str(payload.get("state", "")).upper()
    if state != "OPEN":
        raise RuntimeError(f"[ISSUE] issue #{issue_number} state is {state}; expected OPEN")


def query_open_pr_for_branch(repo: str, branch: str) -> PullRequest:
    payload = run_gh_json(
        repo,
        [
            "gh",
            "pr",
            "list",
            "--state",
            "open",
            "--head",
            branch,
            "--limit",
            "1",
            "--json",
            "number,body,url",
        ],
        error_hint=f"[PR] failed to query open PR for branch {branch}",
    )
    if not isinstance(payload, list) or not payload:
        raise RuntimeError(f"[PR] no open PR found for branch {branch}; create PR first")

    item = payload[0]
    number_raw = item.get("number")
    if not isinstance(number_raw, int):
        raise RuntimeError("[PR] invalid PR payload: number is missing")
    body_raw = item.get("body")
    if body_raw is None:
        body_raw = ""
    if not isinstance(body_raw, str):
        raise RuntimeError("[PR] invalid PR payload: body is not a string")
    url_raw = item.get("url")
    if not isinstance(url_raw, str) or not url_raw:
        raise RuntimeError("[PR] invalid PR payload: url is missing")
    return PullRequest(number=number_raw, body=body_raw, url=url_raw)


def strip_html_comments(text: str) -> str:
    return HTML_COMMENT_PATTERN.sub("", text)


def extract_section(body: str, heading: str, *, level: int) -> str | None:
    target = f"{'#' * level} {heading}"
    lines = body.splitlines()
    start = None
    for index, line in enumerate(lines):
        if line.strip() == target:
            start = index + 1
            break
    if start is None:
        return None

    stop_prefixes = tuple(f"{'#' * current_level} " for current_level in range(1, level + 1))
    collected: list[str] = []
    for line in lines[start:]:
        if line.lstrip().startswith(stop_prefixes):
            break
        collected.append(line)
    return "\n".join(collected)


def normalize_section_content(content: str | None) -> str:
    if content is None:
        return ""
    return strip_html_comments(content).strip()


def has_meaningful_content(content: str | None) -> bool:
    normalized = normalize_section_content(content)
    if not normalized:
        return False

    for line in normalized.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if EMPTY_BULLET_PATTERN.fullmatch(stripped):
            continue
        if EMPTY_CHECKBOX_PATTERN.fullmatch(stripped):
            continue
        if EMPTY_LABEL_PATTERN.fullmatch(stripped):
            continue
        return True
    return False


def require_section(
    pr: PullRequest,
    heading: str,
    *,
    level: int = 2,
    require_content: bool = True,
) -> str:
    content = extract_section(pr.body, heading, level=level)
    section_name = f"{'#' * level} {heading}"
    if content is None:
        raise RuntimeError(f"[PR] #{pr.number} body is missing `{section_name}` (url: {pr.url})")
    if require_content and not has_meaningful_content(content):
        raise RuntimeError(f"[PR] #{pr.number} section `{section_name}` must not be blank (url: {pr.url})")
    return content


def require_any_section(
    pr: PullRequest,
    headings: tuple[str, ...],
    *,
    level: int = 2,
    require_content: bool = True,
) -> str:
    for heading in headings:
        content = extract_section(pr.body, heading, level=level)
        if content is None:
            continue
        if require_content and not has_meaningful_content(content):
            section_name = f"{'#' * level} {heading}"
            raise RuntimeError(
                f"[PR] #{pr.number} section `{section_name}` must not be blank (url: {pr.url})"
            )
        return content

    expected = " / ".join(f"`{'#' * level} {heading}`" for heading in headings)
    raise RuntimeError(f"[PR] #{pr.number} body is missing one of {expected} (url: {pr.url})")


def extract_labeled_value(content: str, label: str) -> str:
    normalized = normalize_section_content(content)
    for line in normalized.splitlines():
        stripped = line.strip()
        for sep in (":", "："):
            prefix = f"- {label}{sep}"
            if stripped.startswith(prefix):
                return stripped[len(prefix):].strip()
    return ""


def is_na_value(value: str | None) -> bool:
    normalized = normalize_section_content(value)
    if not normalized:
        return False
    return NA_VALUE_PATTERN.fullmatch(normalized) is not None


def validate_visual_evidence(pr: PullRequest, *, frontend_required: bool) -> None:
    require_section(pr, "Visual Evidence", level=2, require_content=False)
    screenshots_section = require_section(pr, "Embedded Screenshots", level=3)
    storybook_section = require_section(pr, "Storybook Artifact / Link", level=3)

    storybook_link = extract_labeled_value(storybook_section, "Link")
    visual_acceptance_note = extract_labeled_value(storybook_section, "Visual acceptance note")

    if (
        is_na_value(screenshots_section)
        and is_na_value(storybook_link)
        and is_na_value(visual_acceptance_note)
    ):
        if frontend_required:
            raise RuntimeError(
                f"[PR] #{pr.number} frontend changes require screenshots + Storybook link + visual acceptance note; N/A is not allowed (url: {pr.url})"
            )
        return

    if IMAGE_PATTERN.search(normalize_section_content(screenshots_section)) is None:
        raise RuntimeError(
            f"[PR] #{pr.number} visual evidence must embed at least one screenshot image (url: {pr.url})"
        )
    if URL_PATTERN.search(storybook_link) is None:
        raise RuntimeError(
            f"[PR] #{pr.number} visual evidence must include a clickable Storybook link (url: {pr.url})"
        )
    if not has_meaningful_content(visual_acceptance_note) or is_na_value(visual_acceptance_note):
        raise RuntimeError(
            f"[PR] #{pr.number} visual evidence must include a non-empty Visual acceptance note (url: {pr.url})"
        )


def validate_audit_gate(pr: PullRequest) -> None:
    audit_gate = require_any_section(pr, ("审计门禁", "Audit Gate"), level=2)
    normalized = normalize_section_content(audit_gate)

    for model_line in AUDIT_GATE_MODEL_LINES:
        if model_line not in normalized:
            raise RuntimeError(
                f"[PR] #{pr.number} audit gate must include fixed model line `{model_line}` (url: {pr.url})"
            )

    for index, seat_pattern in enumerate(AUDIT_GATE_SEAT_PATTERNS, start=1):
        if seat_pattern.search(normalized) is None:
            raise RuntimeError(
                f"[PR] #{pr.number} audit gate must include seat {index} FINAL-VERDICT checklist entry (url: {pr.url})"
            )


def validate_invariant_checklist(pr: PullRequest) -> None:
    checklist = require_any_section(pr, ("Invariant Checklist", "阶段 B：Invariant Checklist"), level=2)
    normalized = normalize_section_content(checklist)
    for inv_id in INVARIANT_IDS:
        pattern = re.compile(rf"(?m)^-\s*\[[ xX]\]\s*(?:\*\*)?{re.escape(inv_id)}\b")
        if pattern.search(normalized) is None:
            raise RuntimeError(
                f"[PR] #{pr.number} invariant checklist must include checkbox entry for `{inv_id}` (url: {pr.url})"
            )


def branch_touches_frontend(repo: str) -> bool:
    cmd = ["git", "diff", "--name-only", "origin/main...HEAD"]
    result = run(cmd, cwd=repo)
    print_command_and_output(cmd, result)
    if result.code != 0:
        raise RuntimeError(
            "[PR] failed to detect frontend file changes from `origin/main...HEAD`; run preflight from a synced task worktree"
        )

    for raw_line in result.out.splitlines():
        file_path = raw_line.strip()
        if not file_path:
            continue
        if file_path.startswith("apps/desktop/renderer/") or file_path.startswith("apps/desktop/.storybook/"):
            return True
    return False


def validate_pr_body_format(pr: PullRequest, issue_number: str, *, frontend_required: bool = False) -> None:
    pattern = re.compile(rf"(?i)\bcloses\s+#\s*{re.escape(issue_number)}\b")
    if not pattern.search(pr.body):
        raise RuntimeError(
            f"[PR] #{pr.number} body must contain `Closes #{issue_number}` (url: {pr.url})"
        )
    validate_invariant_checklist(pr)
    require_section(pr, "Validation Evidence", level=2)
    require_section(pr, "Risk & Rollback", level=2)
    validate_visual_evidence(pr, frontend_required=frontend_required)
    validate_audit_gate(pr)


def main() -> int:
    try:
        print("== Repo checks ==")
        repo = git_root()
        ensure_isolated_worktree(repo)
        branch = current_branch(repo)

        print("\n== Branch contract ==")
        match = re.match(r"^task/(?P<n>[0-9]+)-(?P<slug>[a-z0-9-]+)$", branch)
        if not match:
            raise RuntimeError(f"[CONTRACT] branch must be task/<N>-<slug>, got: {branch}")
        issue_number = match.group("n")
        print(f"Branch OK: {branch}")

        print("\n== Issue checks ==")
        validate_issue_is_open(repo, issue_number)
        print(f"Issue OK: #{issue_number} is OPEN")

        print("\n== PR checks ==")
        pr = query_open_pr_for_branch(repo, branch)
        validate_pr_body_format(pr, issue_number, frontend_required=branch_touches_frontend(repo))
        print(f"PR body OK: #{pr.number} satisfies the delivery contract for issue #{issue_number}")

        print("\nOK: preflight checks passed")
        return 0
    except Exception as exc:
        print(f"PRE-FLIGHT FAILED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
