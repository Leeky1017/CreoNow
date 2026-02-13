#!/usr/bin/env python3
from __future__ import annotations

import os
import sys

import agent_pr_preflight as preflight


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/validate_main_session_audit_ci.py <run-log-path>", file=sys.stderr)
        return 2

    run_log_rel = sys.argv[1]
    repo = preflight.git_root()
    run_log_abs = os.path.join(repo, run_log_rel)

    preflight.require_file(run_log_abs)
    reviewed_target_sha = preflight.current_head_parent_sha(repo)
    preflight.validate_main_session_audit(run_log_abs, reviewed_target_sha)
    preflight.validate_main_session_audit_signature_commit(repo, run_log_abs)

    print("✅ Main Session Audit validated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
