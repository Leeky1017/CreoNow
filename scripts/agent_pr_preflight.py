#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class CmdResult:
    code: int
    out: str


def run(cmd: list[str], *, cwd: str | None = None, env: dict[str, str] | None = None) -> CmdResult:
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    return CmdResult(proc.returncode, proc.stdout)


def must_run(cmd: list[str], *, cwd: str | None = None) -> None:
    res = run(cmd, cwd=cwd)
    print(f"$ {' '.join(cmd)}")
    if res.out.strip():
        print(res.out.rstrip())
    if res.code != 0:
        raise RuntimeError(f"command failed: {' '.join(cmd)} (exit {res.code})")


def git_root() -> str:
    res = run(["git", "rev-parse", "--show-toplevel"])
    if res.code != 0:
        print(res.out, file=sys.stderr)
        raise RuntimeError("not a git repository")
    return res.out.strip()


def current_branch(repo_root: str) -> str:
    res = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_root)
    if res.code != 0:
        print(res.out, file=sys.stderr)
        raise RuntimeError("failed to get current branch")
    return res.out.strip()


def require_file(path: str) -> None:
    if not os.path.isfile(path):
        raise RuntimeError(f"[RUN_LOG] required file missing: {path}")


def validate_issue_is_open(repo: str, issue_number: str) -> None:
    cmd = ["gh", "issue", "view", issue_number, "--json", "number,state,title,url"]
    res = run(cmd, cwd=repo)
    print(f"$ {' '.join(cmd)}")
    if res.out.strip():
        print(res.out.rstrip())
    if res.code != 0:
        raise RuntimeError(
            f"[ISSUE] failed to query issue #{issue_number}; cannot validate issue freshness/open state"
        )

    try:
        payload = json.loads(res.out)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"[ISSUE] invalid gh output while checking issue #{issue_number}: {exc}"
        ) from exc

    state = str(payload.get("state", "")).upper()
    if state != "OPEN":
        raise RuntimeError(
            f"[ISSUE] issue #{issue_number} state is {state}; active delivery must use an OPEN issue"
        )


def validate_runlog_pr_field(path: str) -> None:
    with open(path, "r", encoding="utf-8") as fp:
        content = fp.read()

    m = re.search(r"^- PR:\s*(.+)$", content, re.MULTILINE)
    if not m:
        raise RuntimeError(
            f"[RUN_LOG] missing PR field line ('- PR: ...') in {path}"
        )

    value = m.group(1).strip()
    if not value:
        raise RuntimeError(f"[RUN_LOG] PR field cannot be empty in {path}")
    lowered = value.lower()
    if (
        value in {"(待回填)", "(to-be-filled)", "TBD", "TODO"}
        or "待回填" in value
        or "tbd" in lowered
        or "todo" in lowered
        or "placeholder" in lowered
    ):
        raise RuntimeError(
            f"[RUN_LOG] PR field still placeholder in {path}: {value}"
        )
    if not re.match(r"^https?://", value):
        raise RuntimeError(
            f"[RUN_LOG] PR field must be a real URL in {path}: {value}"
        )
    if "/pull/" not in value:
        raise RuntimeError(
            f"[RUN_LOG] PR field must be a pull-request URL in {path}: {value}"
        )


REQUIRED_CHANGE_TASKS_HEADINGS: tuple[str, ...] = (
    "## 1. Specification",
    "## 2. TDD Mapping（先测前提）",
    "## 3. Red（先写失败测试）",
    "## 4. Green（最小实现通过）",
    "## 5. Refactor（保持绿灯）",
    "## 6. Evidence",
)


def list_active_changes(repo: str) -> list[str]:
    changes_root = os.path.join(repo, "openspec", "changes")
    if not os.path.isdir(changes_root):
        return []
    active: list[str] = []
    for name in sorted(os.listdir(changes_root)):
        if name.startswith(".") or name in {"archive", "_template"}:
            continue
        abs_path = os.path.join(changes_root, name)
        if os.path.isdir(abs_path):
            active.append(name)
    return active


def parse_markdown_checkbox_states(content: str) -> list[bool]:
    states: list[bool] = []
    for mark in re.findall(r"^- \[([ xX])\]", content, flags=re.MULTILINE):
        states.append(mark.lower() == "x")
    return states


def validate_no_completed_active_changes(repo: str) -> None:
    active_changes = list_active_changes(repo)
    if not active_changes:
        print("(skip) active change archive check: no active changes")
        return

    completed_active: list[str] = []
    for change_name in active_changes:
        tasks_path = os.path.join(repo, "openspec", "changes", change_name, "tasks.md")
        if not os.path.isfile(tasks_path):
            continue

        with open(tasks_path, "r", encoding="utf-8") as fp:
            content = fp.read()

        checkbox_states = parse_markdown_checkbox_states(content)
        if checkbox_states and all(checkbox_states):
            completed_active.append(change_name)

    if completed_active:
        joined = ", ".join(sorted(completed_active))
        raise RuntimeError(
            "[OPENSPEC_CHANGE] change tasks.md checkboxes are all checked, so the change is completed "
            "and must be archived from openspec/changes/ to openspec/changes/archive/: "
            f"{joined}"
        )


def validate_tdd_first_change_tasks(repo: str, changed_files: set[str]) -> None:
    targets = sorted(
        path
        for path in changed_files
        if re.match(r"^openspec/changes/[^/]+/tasks\.md$", path) and not path.startswith("openspec/changes/archive/")
    )
    if not targets:
        print("(skip) openspec change tasks TDD-structure check: no changed openspec/changes/*/tasks.md")
        return

    for rel_path in targets:
        abs_path = os.path.join(repo, rel_path)
        if not os.path.isfile(abs_path):
            raise RuntimeError(f"[OPENSPEC_CHANGE] missing tasks file: {rel_path}")

        with open(abs_path, "r", encoding="utf-8") as fp:
            content = fp.read()

        cursor = -1
        for heading in REQUIRED_CHANGE_TASKS_HEADINGS:
            idx = content.find(heading)
            if idx < 0:
                raise RuntimeError(
                    f"[OPENSPEC_CHANGE] {rel_path} missing required heading: {heading}"
                )
            if idx <= cursor:
                raise RuntimeError(
                    f"[OPENSPEC_CHANGE] {rel_path} headings out of order: {heading}"
                )
            cursor = idx

        if "未出现 Red（失败测试）不得进入实现" not in content:
            raise RuntimeError(
                f"[OPENSPEC_CHANGE] {rel_path} must contain Red-gate text: 未出现 Red（失败测试）不得进入实现"
            )

        if "Scenario" not in content or "映射" not in content:
            raise RuntimeError(
                f"[OPENSPEC_CHANGE] {rel_path} must include Scenario->测试映射要求 in TDD Mapping section"
            )


def validate_execution_order_doc(repo: str, changed_files: set[str]) -> None:
    active_changes = list_active_changes(repo)
    if len(active_changes) < 2:
        print("(skip) execution order check: active changes < 2")
        return

    order_doc_rel = "openspec/changes/EXECUTION_ORDER.md"
    order_doc_abs = os.path.join(repo, order_doc_rel)
    if not os.path.isfile(order_doc_abs):
        raise RuntimeError(
            "[OPENSPEC_CHANGE] multiple active changes detected; missing openspec/changes/EXECUTION_ORDER.md"
        )

    with open(order_doc_abs, "r", encoding="utf-8") as fp:
        content = fp.read()

    for marker in ("更新时间", "## 执行策略", "## 执行顺序", "## 依赖说明"):
        if marker not in content:
            raise RuntimeError(
                f"[OPENSPEC_CHANGE] {order_doc_rel} missing required section/field: {marker}"
            )

    updated_at = re.search(r"^更新时间：(\d{4}-\d{2}-\d{2} \d{2}:\d{2})$", content, re.MULTILINE)
    if not updated_at:
        raise RuntimeError(
            f"[OPENSPEC_CHANGE] {order_doc_rel} 更新时间格式必须为 YYYY-MM-DD HH:mm"
        )

    for change_name in active_changes:
        if change_name not in content:
            raise RuntimeError(
                f"[OPENSPEC_CHANGE] {order_doc_rel} must include active change: {change_name}"
            )

    active_change_touched = any(
        any(path.startswith(f"openspec/changes/{change_name}/") for change_name in active_changes)
        for path in changed_files
    )
    if active_change_touched and order_doc_rel not in changed_files:
        raise RuntimeError(
            "[OPENSPEC_CHANGE] active change content updated but openspec/changes/EXECUTION_ORDER.md not updated in this PR"
        )


def main() -> int:
    try:
        repo = git_root()
        branch = current_branch(repo)
        m = re.match(r"^task/(?P<n>[0-9]+)-(?P<slug>[a-z0-9-]+)$", branch)
        if not m:
            raise RuntimeError(f"[CONTRACT] branch must be task/<N>-<slug>, got: {branch}")

        issue_number = m.group("n")
        slug = m.group("slug")
        run_log = os.path.join(repo, "openspec", "_ops", "task_runs", f"ISSUE-{issue_number}.md")
        require_file(run_log)
        validate_runlog_pr_field(run_log)

        print("== Repo checks ==")
        must_run(["git", "status", "--porcelain=v1"], cwd=repo)

        print("\n== Issue checks ==")
        validate_issue_is_open(repo, issue_number)

        print("\n== Rulebook checks ==")
        task_id = f"issue-{issue_number}-{slug}"
        task_dir = os.path.join(repo, "rulebook", "tasks", task_id)
        if not os.path.isdir(task_dir):
            raise RuntimeError(f"[RULEBOOK] required task dir missing: {task_dir}")
        must_run(["rulebook", "task", "validate", task_id], cwd=repo)

        print("\n== Workspace checks ==")
        # Keep preflight OS-agnostic; Windows-only build/E2E are enforced in CI.
        #
        # Formatting policy:
        # - We only enforce Prettier on files changed in this branch, to avoid
        #   blocking delivery on legacy/unrelated formatting drift.
        changed_files: set[str] = set()
        for cmd in [
            ["git", "diff", "--name-only", "--diff-filter=ACMR", "origin/main...HEAD"],
            ["git", "diff", "--name-only", "--diff-filter=ACMR"],
            ["git", "ls-files", "--others", "--exclude-standard"],
        ]:
            res = run(cmd, cwd=repo)
            if res.code != 0:
                print(res.out, file=sys.stderr)
                raise RuntimeError(f"failed to list changed files: {' '.join(cmd)}")
            for line in res.out.splitlines():
                if line.strip():
                    changed_files.add(line.strip())

        print("\n== OpenSpec change checks ==")
        validate_no_completed_active_changes(repo)
        validate_tdd_first_change_tasks(repo, changed_files)
        validate_execution_order_doc(repo, changed_files)

        prettier_exts = (
            ".cjs",
            ".css",
            ".html",
            ".js",
            ".json",
            ".md",
            ".mjs",
            ".ts",
            ".tsx",
            ".yaml",
            ".yml",
        )
        prettier_targets = sorted([p for p in changed_files if p.endswith(prettier_exts)])
        if prettier_targets:
            must_run(["pnpm", "exec", "prettier", "--check", *prettier_targets], cwd=repo)
        else:
            print("(skip) prettier --check: no changed targets")

        must_run(["pnpm", "typecheck"], cwd=repo)
        must_run(["pnpm", "lint"], cwd=repo)
        must_run(["pnpm", "contract:check"], cwd=repo)
        must_run(["pnpm", "test:unit"], cwd=repo)

        return 0
    except Exception as e:
        print(f"PRE-FLIGHT FAILED: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
