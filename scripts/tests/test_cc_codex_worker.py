import json
import os
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import cc_codex_worker  # noqa: E402


class ParseReviewDecisionTests(unittest.TestCase):
    def test_parse_review_decision_should_return_pass(self) -> None:
        decision = cc_codex_worker.parse_review_decision(
            "Summary\nFINAL_DECISION: PASS\nFindings: none\n"
        )
        self.assertEqual("PASS", decision)

    def test_parse_review_decision_should_return_fail(self) -> None:
        decision = cc_codex_worker.parse_review_decision(
            "FINAL_DECISION: FAIL\n1. missing test\n"
        )
        self.assertEqual("FAIL", decision)

    def test_parse_review_decision_should_return_unknown_when_marker_missing(self) -> None:
        decision = cc_codex_worker.parse_review_decision("no decision marker")
        self.assertEqual("UNKNOWN", decision)


class BuildCodexCommandTests(unittest.TestCase):
    def test_build_codex_exec_cmd_should_include_model_when_provided(self) -> None:
        args = cc_codex_worker.parse_args(
            [
                "--task-file",
                "/tmp/task.md",
                "--acceptance-file",
                "/tmp/acceptance.md",
                "--codex-model",
                "gpt-5-codex",
            ]
        )
        cmd = cc_codex_worker.build_codex_exec_cmd(args, "/tmp/repo")

        self.assertEqual(
            [
                "codex",
                "exec",
                "--cd",
                "/tmp/repo",
                "-s",
                "workspace-write",
                "-a",
                "never",
                "-m",
                "gpt-5-codex",
                "-",
            ],
            cmd,
        )

    def test_build_codex_review_cmd_should_include_uncommitted_and_prompt(self) -> None:
        args = cc_codex_worker.parse_args(
            [
                "--task-file",
                "/tmp/task.md",
                "--acceptance-file",
                "/tmp/acceptance.md",
                "--codex-review",
            ]
        )
        cmd = cc_codex_worker.build_codex_review_cmd(args, "review prompt")

        self.assertEqual(["codex", "review", "--uncommitted", "review prompt"], cmd)


class OrchestrateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.base = self.tmp.name
        self.task_file = os.path.join(self.base, "task.md")
        self.acceptance_file = os.path.join(self.base, "acceptance.md")
        with open(self.task_file, "w", encoding="utf-8") as fp:
            fp.write("Implement feature X.")
        with open(self.acceptance_file, "w", encoding="utf-8") as fp:
            fp.write("All tests pass.")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_orchestrate_should_write_artifacts_without_review(self) -> None:
        args = cc_codex_worker.parse_args(
            [
                "--workdir",
                self.base,
                "--task-file",
                self.task_file,
                "--acceptance-file",
                self.acceptance_file,
                "--output-dir",
                os.path.join(self.base, ".agent-bus"),
                "--run-id",
                "run-01",
            ]
        )

        with mock.patch.object(
            cc_codex_worker,
            "run_command",
            return_value=cc_codex_worker.CmdResult(code=0, out="exec ok"),
        ):
            exit_code, summary = cc_codex_worker.orchestrate(args)

        self.assertEqual(0, exit_code)
        self.assertEqual(0, summary["exec"]["exit_code"])
        self.assertFalse(summary["review"]["enabled"])

        run_dir = summary["run_dir"]
        self.assertTrue(os.path.isdir(run_dir))
        self.assertTrue(os.path.isfile(os.path.join(run_dir, "codex.exec.prompt.md")))
        self.assertTrue(os.path.isfile(os.path.join(run_dir, "codex.exec.log")))
        self.assertTrue(os.path.isfile(os.path.join(run_dir, "summary.json")))

        with open(os.path.join(run_dir, "summary.json"), "r", encoding="utf-8") as fp:
            disk_summary = json.load(fp)
        self.assertEqual("run-01", disk_summary["run_id"])

    def test_orchestrate_should_return_fail_code_when_review_fails(self) -> None:
        args = cc_codex_worker.parse_args(
            [
                "--workdir",
                self.base,
                "--task-file",
                self.task_file,
                "--acceptance-file",
                self.acceptance_file,
                "--output-dir",
                os.path.join(self.base, ".agent-bus"),
                "--run-id",
                "run-02",
                "--codex-review",
            ]
        )

        with mock.patch.object(
            cc_codex_worker,
            "run_command",
            side_effect=[
                cc_codex_worker.CmdResult(code=0, out="exec ok"),
                cc_codex_worker.CmdResult(code=0, out="FINAL_DECISION: FAIL"),
            ],
        ):
            exit_code, summary = cc_codex_worker.orchestrate(args)

        self.assertEqual(10, exit_code)
        self.assertEqual("FAIL", summary["review"]["decision"])


if __name__ == "__main__":
    unittest.main()
