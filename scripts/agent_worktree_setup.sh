#!/usr/bin/env bash
set -euo pipefail

N="${1:-}"
SLUG="${2:-}"

if [[ -z "$N" || -z "$SLUG" ]]; then
  echo "Usage: scripts/agent_worktree_setup.sh <issue-number> <slug>" >&2
  exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
if [[ "$(pwd -P)" != "$(cd "$REPO_ROOT" && pwd -P)" ]]; then
  echo "ERROR: run this script from the repo root: $REPO_ROOT" >&2
  exit 2
fi

scripts/agent_controlplane_sync.sh

if [[ ! "$N" =~ ^[0-9]+$ ]]; then
  echo "ERROR: issue-number must be numeric, got: $N" >&2
  exit 2
fi

if [[ "$SLUG" =~ [^a-z0-9-] ]]; then
  echo "ERROR: slug must be kebab-case (a-z0-9-), got: $SLUG" >&2
  exit 2
fi

BRANCH="task/${N}-${SLUG}"
DIR=".worktrees/issue-${N}-${SLUG}"

mkdir -p .worktrees
git fetch origin main
git worktree add -b "$BRANCH" "$DIR" origin/main
echo "Worktree created: $DIR"
echo "Branch: $BRANCH"
