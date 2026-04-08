import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_SOURCE = REPO_ROOT / "scripts" / "agent_pr_automerge_and_sync.sh"


class AgentPRAutomergeAndSyncTests(unittest.TestCase):
    def _write_executable(self, path: Path, content: str) -> None:
        path.write_text(content)
        path.chmod(path.stat().st_mode | stat.S_IXUSR)

    def _make_sandbox(
        self,
        *,
        pr_merged: bool,
        preflight_success: bool = False,
        audit_pass: bool = True,
        matching_comments: int = 1,
        distinct_authors: int = 1,
        pr_author: str = "engineering-bot",
    ) -> tuple[Path, Path]:
        temp_dir = Path(tempfile.mkdtemp(prefix="automerge-script-"))
        controlplane_root = temp_dir / "repo"
        worktree = controlplane_root / ".worktrees" / "issue-42-demo"
        scripts_dir = worktree / "scripts"
        fake_bin = temp_dir / "bin"

        worktree.mkdir(parents=True)
        scripts_dir.mkdir(parents=True)
        fake_bin.mkdir(parents=True)
        (controlplane_root / ".git").mkdir(parents=True)

        shutil.copy2(SCRIPT_SOURCE, scripts_dir / "agent_pr_automerge_and_sync.sh")
        (scripts_dir / "agent_pr_automerge_and_sync.sh").chmod(
            (scripts_dir / "agent_pr_automerge_and_sync.sh").stat().st_mode | stat.S_IXUSR
        )

        if preflight_success:
            preflight_script = "#!/usr/bin/env bash\n" "echo 'OK: preflight checks passed'\n" "exit 0\n"
        else:
            preflight_script = (
                "#!/usr/bin/env bash\n"
                "echo 'PRE-FLIGHT FAILED: [ISSUE] issue #42 state is CLOSED; expected OPEN' >&2\n"
                "exit 1\n"
            )

        self._write_executable(
            scripts_dir / "agent_pr_preflight.sh",
            preflight_script,
        )
        self._write_executable(
            scripts_dir / "agent_controlplane_sync.sh",
            "#!/usr/bin/env bash\n"
            "echo sync >> \"${SYNC_LOG:?}\"\n",
        )
        audit_payload = json.dumps(
            {
                "audit_pass": audit_pass,
                "matching_comments": matching_comments,
                "distinct_authors": distinct_authors,
                "author_check_enforced": True,
                "trusted_reviewer_check_enforced": True,
                "matching_trusted_authors": 1 if audit_pass else 0,
            }
        )
        capabilities_payload = json.dumps(
            {
                "selected_channel": "gh",
                "blocker": None,
                "reason": "test",
            }
        )
        blocker_comment_payload = json.dumps({"body": "comment"})
        (scripts_dir / "agent_github_delivery.py").write_text(
            textwrap.dedent(
                f"""
                #!/usr/bin/env python3
                import sys
                import os

                command = sys.argv[1]
                if command == "capabilities":
                    print({capabilities_payload!r})
                elif command == "comment-payload":
                    print({blocker_comment_payload!r})
                elif command == "audit-pass":
                    log_path = os.environ.get("AUDIT_ARGS_LOG", "")
                    if log_path:
                        with open(log_path, "a", encoding="utf-8") as handle:
                            handle.write(" ".join(sys.argv[2:]) + "\\n")
                    print({audit_payload!r})
                else:
                    raise SystemExit(f"unsupported command: {{command}}")
                """
            ).strip()
            + "\n"
        )

        self._write_executable(
            fake_bin / "git",
            textwrap.dedent(
                f"""
                #!/usr/bin/env python3
                import os
                import sys

                repo_root = {repr(str(worktree))}
                controlplane_root = {repr(str(controlplane_root))}
                common_dir = {repr(str(controlplane_root / '.git'))}
                synced_sha = "abc123"

                args = sys.argv[1:]
                if args[:2] == ["rev-parse", "--show-toplevel"]:
                    print(repo_root)
                elif args[:2] == ["rev-parse", "--git-common-dir"]:
                    print(common_dir)
                elif args[:2] == ["rev-parse", "--abbrev-ref"]:
                    print("task/42-demo")
                elif args[:2] == ["status", "--porcelain=v1"]:
                    pass
                elif args[:2] == ["fetch", "origin"]:
                    pass
                elif args[:2] == ["rebase", "origin/main"]:
                    pass
                elif args[:1] == ["push"]:
                    pass
                elif len(args) >= 4 and args[0] == "-C" and args[2:4] == ["rev-parse", "main"]:
                    print(synced_sha)
                elif len(args) >= 4 and args[0] == "-C" and args[2:4] == ["rev-parse", "origin/main"]:
                    print(synced_sha)
                else:
                    raise SystemExit(f"unexpected git args: {{args}}")
                """
            ).strip()
            + "\n",
        )

        merged_at = "2026-03-11T00:53:12Z" if pr_merged else ""
        comments_payload = json.dumps(
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
        self._write_executable(
            fake_bin / "gh",
            textwrap.dedent(
                f"""
                #!/usr/bin/env python3
                import sys

                merged_at = {repr(merged_at)}
                pr_url = "https://example.com/pr/7"
                comments_payload = {comments_payload!r}

                args = sys.argv[1:]
                if args[:3] == ["pr", "view", "7"] and "--json" in args:
                    json_field = args[args.index("--json") + 1]
                    if json_field == "comments":
                        print(comments_payload)
                    elif json_field == "author" and "--jq" in args:
                        jq = args[args.index("--jq") + 1]
                        if jq == ".author.login // empty":
                            print({repr(pr_author)})
                        else:
                            raise SystemExit(f"unexpected gh jq: {{jq}}")
                    elif json_field == "headRefOid" and "--jq" in args:
                        jq = args[args.index("--jq") + 1]
                        if jq == ".headRefOid // empty":
                            print("3730256a0ba1c088504746e42923afc84b1e7d41")
                        else:
                            raise SystemExit(f"unexpected gh jq: {{jq}}")
                    elif "--jq" in args:
                        jq = args[args.index("--jq") + 1]
                        if jq.startswith(".mergedAt //"):
                            print(merged_at)
                        elif jq == ".url":
                            print(pr_url)
                        else:
                            raise SystemExit(f"unexpected gh jq: {{jq}}")
                    else:
                        raise SystemExit(f"unexpected gh args: {{args}}")
                elif args[:2] == ["pr", "list"] and "--jq" in args:
                    print("")
                elif args[:3] == ["pr", "comment", "7"]:
                    pass
                else:
                    raise SystemExit(f"unexpected gh args: {{args}}")
                """
            ).strip()
            + "\n",
        )

        self._write_executable(
            fake_bin / "sleep",
            "#!/usr/bin/env bash\n"
            "echo sleep >> \"${SLEEP_LOG:?}\"\n"
            "exit 99\n",
        )

        return temp_dir, worktree

    def _run_script(
        self,
        worktree: Path,
        temp_dir: Path,
        *,
        extra_args: list[str],
        extra_env: dict[str, str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        if extra_env:
            env.update(extra_env)
        env["PATH"] = f"{temp_dir / 'bin'}:{env['PATH']}"
        env["SYNC_LOG"] = str(temp_dir / "sync.log")
        env["SLEEP_LOG"] = str(temp_dir / "sleep.log")
        env["AUDIT_ARGS_LOG"] = str(temp_dir / "audit-args.log")
        return subprocess.run(
            [
                str(worktree / "scripts" / "agent_pr_automerge_and_sync.sh"),
                "--pr",
                "7",
                "--no-create",
                *extra_args,
            ],
            cwd=worktree,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )

    def test_help_should_describe_reviewer_consolidated_gate(self) -> None:
        temp_dir, worktree = self._make_sandbox(pr_merged=False)
        try:
            env = os.environ.copy()
            env["PATH"] = f"{temp_dir / 'bin'}:{env['PATH']}"
            result = subprocess.run(
                [str(worktree / "scripts" / "agent_pr_automerge_and_sync.sh"), "--help"],
                cwd=worktree,
                env=env,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            self.assertEqual(0, result.returncode, result.stdout)
            self.assertIn(
                "4 zero-finding audit reports plus 1 reviewer consolidated verbatim PR discussion comment (issue comment)",
                result.stdout,
            )
            self.assertNotIn("four independent audit comments", result.stdout)
        finally:
            shutil.rmtree(temp_dir)

    def test_should_treat_merged_pr_as_terminal_success_when_issue_is_closed(self) -> None:
        temp_dir, worktree = self._make_sandbox(pr_merged=True)
        try:
            result = self._run_script(worktree, temp_dir, extra_args=["--enable-auto-merge"])
            self.assertEqual(0, result.returncode, result.stdout)
            self.assertIn("already merged", result.stdout)
            self.assertTrue((temp_dir / "sync.log").exists(), result.stdout)
            self.assertFalse((temp_dir / "sleep.log").exists(), result.stdout)
        finally:
            shutil.rmtree(temp_dir)

    def test_should_not_bypass_closed_issue_when_pr_is_not_merged(self) -> None:
        temp_dir, worktree = self._make_sandbox(pr_merged=False)
        try:
            result = self._run_script(worktree, temp_dir, extra_args=["--no-wait-preflight"])
            self.assertEqual(1, result.returncode, result.stdout)
            self.assertIn("preflight reported issues", result.stdout)
            self.assertFalse((temp_dir / "sync.log").exists(), result.stdout)
        finally:
            shutil.rmtree(temp_dir)

    def test_should_block_auto_merge_until_reviewer_consolidated_zero_findings_comment_exists(self) -> None:
        temp_dir, worktree = self._make_sandbox(
            pr_merged=False,
            preflight_success=True,
            audit_pass=False,
            matching_comments=0,
            distinct_authors=0,
        )
        try:
            result = self._run_script(
                worktree,
                temp_dir,
                extra_args=["--enable-auto-merge"],
                extra_env={"CODEX_AUDIT_TRUSTED_REVIEWERS": "reviewer-bot"},
            )
            self.assertEqual(1, result.returncode, result.stdout)
            self.assertIn("1+4+1 reviewer-consolidated zero-findings gate", result.stdout)
            self.assertIn("trusted reviewer account must post one consolidated verbatim comment", result.stdout.lower())
            self.assertIn("matching_comments=0", result.stdout)
            self.assertIn("distinct_authors=0", result.stdout)
            self.assertFalse((temp_dir / "sync.log").exists(), result.stdout)
        finally:
            shutil.rmtree(temp_dir)

    def test_should_not_append_pr_author_when_explicit_trusted_reviewers_are_configured(self) -> None:
        temp_dir, worktree = self._make_sandbox(
            pr_merged=False,
            preflight_success=True,
            audit_pass=False,
            matching_comments=0,
            distinct_authors=0,
            pr_author="engineering-bot",
        )
        try:
            result = self._run_script(
                worktree,
                temp_dir,
                extra_args=["--enable-auto-merge"],
                extra_env={"CODEX_AUDIT_TRUSTED_REVIEWERS": "reviewer-bot"},
            )
            self.assertEqual(1, result.returncode, result.stdout)
            args_log = (temp_dir / "audit-args.log").read_text()
            self.assertIn("--trusted-reviewer reviewer-bot", args_log)
            self.assertNotIn("--trusted-reviewer engineering-bot", args_log)
            self.assertIn("--expected-head-sha 3730256a0ba1c088504746e42923afc84b1e7d41", args_log)
        finally:
            shutil.rmtree(temp_dir)

    def test_should_not_fallback_to_pr_author_by_default_when_trusted_reviewers_are_empty(self) -> None:
        temp_dir, worktree = self._make_sandbox(
            pr_merged=False,
            preflight_success=True,
            audit_pass=False,
            matching_comments=0,
            distinct_authors=0,
            pr_author="engineering-bot",
        )
        try:
            result = self._run_script(
                worktree,
                temp_dir,
                extra_args=["--enable-auto-merge"],
            )
            self.assertEqual(1, result.returncode, result.stdout)
            self.assertIn("trusted reviewer gate is not configured", result.stdout.lower())
            self.assertFalse((temp_dir / "audit-args.log").exists())
        finally:
            shutil.rmtree(temp_dir)

    def test_should_enable_pr_author_fallback_only_when_flag_is_true(self) -> None:
        temp_dir, worktree = self._make_sandbox(
            pr_merged=False,
            preflight_success=True,
            audit_pass=False,
            matching_comments=0,
            distinct_authors=0,
            pr_author="engineering-bot",
        )
        try:
            result = self._run_script(
                worktree,
                temp_dir,
                extra_args=["--enable-auto-merge"],
                extra_env={"CODEX_AUDIT_ALLOW_PR_AUTHOR_FALLBACK": "true"},
            )
            self.assertEqual(1, result.returncode, result.stdout)
            args_log = (temp_dir / "audit-args.log").read_text()
            self.assertIn("--trusted-reviewer engineering-bot", args_log)
            self.assertIn("--expected-head-sha 3730256a0ba1c088504746e42923afc84b1e7d41", args_log)
        finally:
            shutil.rmtree(temp_dir)


if __name__ == "__main__":
    unittest.main()
