import os
import tempfile
import unittest
import sys

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


if __name__ == "__main__":
    unittest.main()
