#!/usr/bin/env python3
from __future__ import annotations

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
        raise RuntimeError(f"required file missing: {path}")


def main() -> int:
    try:
        repo = git_root()
        branch = current_branch(repo)
        m = re.match(r"^task/(?P<n>[0-9]+)-(?P<slug>[a-z0-9-]+)$", branch)
        if not m:
            raise RuntimeError(f"branch must be task/<N>-<slug>, got: {branch}")

        issue_number = m.group("n")
        slug = m.group("slug")
        run_log = os.path.join(repo, "openspec", "_ops", "task_runs", f"ISSUE-{issue_number}.md")
        require_file(run_log)

        print("== Repo checks ==")
        must_run(["git", "status", "--porcelain=v1"], cwd=repo)

        print("\n== Rulebook checks ==")
        task_id = f"issue-{issue_number}-{slug}"
        task_dir = os.path.join(repo, "rulebook", "tasks", task_id)
        if os.path.isdir(task_dir):
            must_run(["rulebook", "task", "validate", task_id], cwd=repo)
        else:
            print(f"(skip) rulebook task dir not found: {task_dir}")

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

