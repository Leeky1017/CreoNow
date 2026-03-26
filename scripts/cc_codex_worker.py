#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from typing import Any


REVIEW_FAIL_EXIT = 10
EXEC_FAIL_EXIT = 20
REVIEW_CMD_FAIL_EXIT = 21


@dataclass(frozen=True)
class CmdResult:
    code: int
    out: str


def run_command(cmd: list[str], *, cwd: str, input_text: str | None = None) -> CmdResult:
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        input=input_text,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    return CmdResult(code=proc.returncode, out=proc.stdout)


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as fp:
        return fp.read().strip()


def write_text(path: str, content: str) -> None:
    with open(path, "w", encoding="utf-8") as fp:
        fp.write(content)


def write_json(path: str, payload: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, indent=2)
        fp.write("\n")


def default_run_id() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def create_run_dir(output_dir: str, run_id: str) -> str:
    run_dir = os.path.join(os.path.abspath(output_dir), "runs", run_id)
    os.makedirs(run_dir, exist_ok=False)
    return run_dir


def build_execution_prompt(task: str, acceptance: str, feedback: str | None) -> str:
    parts = [
        "You are the Codex execution worker.",
        "Implement only what is requested and keep changes minimal and verifiable.",
        "",
        "## Task",
        task,
        "",
        "## Acceptance Criteria",
        acceptance,
    ]
    if feedback and feedback.strip():
        parts.extend(
            [
                "",
                "## Latest Audit Feedback",
                feedback.strip(),
                "",
                "Fix all findings before finishing.",
            ]
        )
    parts.extend(
        [
            "",
            "Execution constraints:",
            "- Follow spec-first and test-first discipline.",
            "- Run relevant tests before finishing.",
            "- Summarize changed files and verification commands in your final response.",
        ]
    )
    return "\n".join(parts).strip() + "\n"


def build_review_prompt(acceptance: str) -> str:
    return (
        "Audit current uncommitted changes against the acceptance criteria below.\n\n"
        "## Acceptance Criteria\n"
        f"{acceptance}\n\n"
        "Output format (strict):\n"
        "FINAL_DECISION: PASS|FAIL\n"
        "FINDINGS:\n"
        "1. <first finding or NONE>\n"
    )


def parse_review_decision(review_text: str) -> str:
    match = re.search(r"(?mi)^FINAL_DECISION:\s*(PASS|FAIL)\s*$", review_text)
    if not match:
        return "UNKNOWN"
    return match.group(1).upper()


def build_codex_exec_cmd(args: argparse.Namespace, workdir: str) -> list[str]:
    cmd = [
        args.codex_bin,
        "exec",
        "--cd",
        workdir,
        "-s",
        args.codex_sandbox,
        "-a",
        args.codex_approval,
    ]
    if args.codex_model:
        cmd.extend(["-m", args.codex_model])
    cmd.append("-")
    return cmd


def build_codex_review_cmd(args: argparse.Namespace, review_prompt: str) -> list[str]:
    return [args.codex_bin, "review", "--uncommitted", review_prompt]


def orchestrate(args: argparse.Namespace) -> tuple[int, dict[str, Any]]:
    workdir = os.path.abspath(args.workdir)
    task_text = read_text(args.task_file)
    acceptance_text = read_text(args.acceptance_file)
    feedback_text = read_text(args.feedback_file) if args.feedback_file else ""

    run_id = args.run_id or default_run_id()
    run_dir = create_run_dir(args.output_dir, run_id)

    write_text(os.path.join(run_dir, "input.task.md"), task_text + "\n")
    write_text(os.path.join(run_dir, "input.acceptance.md"), acceptance_text + "\n")
    if args.feedback_file:
        write_text(os.path.join(run_dir, "input.feedback.md"), feedback_text + "\n")

    exec_prompt = build_execution_prompt(task_text, acceptance_text, feedback_text)
    exec_prompt_path = os.path.join(run_dir, "codex.exec.prompt.md")
    exec_log_path = os.path.join(run_dir, "codex.exec.log")
    write_text(exec_prompt_path, exec_prompt)

    exec_cmd = build_codex_exec_cmd(args, workdir)
    exec_result = run_command(exec_cmd, cwd=workdir, input_text=exec_prompt)
    write_text(exec_log_path, exec_result.out)

    summary: dict[str, Any] = {
        "run_id": run_id,
        "workdir": workdir,
        "run_dir": run_dir,
        "exec": {
            "command": exec_cmd,
            "prompt_file": exec_prompt_path,
            "log_file": exec_log_path,
            "exit_code": exec_result.code,
        },
        "review": {
            "enabled": bool(args.codex_review),
            "command": None,
            "prompt_file": None,
            "log_file": None,
            "exit_code": None,
            "decision": None,
        },
    }

    exit_code = 0
    if exec_result.code != 0:
        exit_code = EXEC_FAIL_EXIT
    elif args.codex_review:
        review_prompt = build_review_prompt(acceptance_text)
        review_prompt_path = os.path.join(run_dir, "codex.review.prompt.md")
        review_log_path = os.path.join(run_dir, "codex.review.log")
        write_text(review_prompt_path, review_prompt)

        review_cmd = build_codex_review_cmd(args, review_prompt)
        review_result = run_command(review_cmd, cwd=workdir)
        write_text(review_log_path, review_result.out)
        decision = parse_review_decision(review_result.out)

        summary["review"] = {
            "enabled": True,
            "command": review_cmd,
            "prompt_file": review_prompt_path,
            "log_file": review_log_path,
            "exit_code": review_result.code,
            "decision": decision,
        }

        if review_result.code != 0:
            exit_code = REVIEW_CMD_FAIL_EXIT
        elif decision != "PASS":
            exit_code = REVIEW_FAIL_EXIT

    summary_path = os.path.join(run_dir, "summary.json")
    write_json(summary_path, summary)
    summary["summary_file"] = summary_path
    return exit_code, summary


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CC-controlled Codex worker runner with artifact logging."
    )
    parser.add_argument("--task-file", required=True, help="Path to task description markdown file.")
    parser.add_argument(
        "--acceptance-file", required=True, help="Path to acceptance criteria markdown file."
    )
    parser.add_argument("--feedback-file", default=None, help="Path to latest audit feedback file.")
    parser.add_argument("--workdir", default=".", help="Repository working directory.")
    parser.add_argument(
        "--output-dir",
        default=".agent-bus/cc-codex",
        help="Base directory for run artifacts.",
    )
    parser.add_argument("--run-id", default=None, help="Optional deterministic run id.")
    parser.add_argument("--codex-bin", default="codex", help="Codex executable path.")
    parser.add_argument("--codex-model", default=None, help="Optional Codex model override.")
    parser.add_argument(
        "--codex-sandbox",
        default="workspace-write",
        choices=["read-only", "workspace-write", "danger-full-access"],
        help="Codex sandbox mode.",
    )
    parser.add_argument(
        "--codex-approval",
        default="never",
        choices=["untrusted", "on-failure", "on-request", "never"],
        help="Codex approval mode.",
    )
    parser.add_argument(
        "--codex-review",
        action="store_true",
        help="Run codex review after execution and parse FINAL_DECISION marker.",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    exit_code, summary = orchestrate(args)

    print(f"run_dir={summary['run_dir']}")
    print(f"exec_exit_code={summary['exec']['exit_code']}")
    print(f"review_enabled={summary['review']['enabled']}")
    if summary["review"]["enabled"]:
        print(f"review_exit_code={summary['review']['exit_code']}")
        print(f"review_decision={summary['review']['decision']}")
    print(f"summary_file={summary['summary_file']}")

    if exit_code == 0:
        print("[OK] worker run completed")
    elif exit_code == REVIEW_FAIL_EXIT:
        print("[FAIL] review decision is not PASS")
    elif exit_code == EXEC_FAIL_EXIT:
        print("[FAIL] codex execution failed")
    else:
        print("[FAIL] codex review command failed")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
