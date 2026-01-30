#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/agent_worktree_cleanup.sh <issue-number> <slug> [--force]

Behavior:
  - Removes worktree directory: .worktrees/issue-<N>-<slug>
  - Deletes local branch: task/<N>-<slug> (if exists)
  - Prunes stale worktree metadata
EOF
}

FORCE="false"

if [[ $# -lt 2 ]]; then
  usage >&2
  exit 2
fi

N="${1:-}"
SLUG="${2:-}"
shift 2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE="true"
      shift 1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

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

COMMON_DIR="$(git rev-parse --git-common-dir)"
CONTROLPLANE_ROOT="$(cd "$(dirname "$COMMON_DIR")" && pwd)"

TARGET_DIR="${CONTROLPLANE_ROOT}/${DIR}"

PWD_REAL="$(pwd -P)"
TARGET_REAL=""
if [[ -d "$TARGET_DIR" ]]; then
  TARGET_REAL="$(cd "$TARGET_DIR" && pwd -P)"
fi

if [[ -n "$TARGET_REAL" && "$PWD_REAL" == "$TARGET_REAL"* ]]; then
  echo "ERROR: you are inside the worktree to be removed: $TARGET_REAL" >&2
  echo "       cd to controlplane root and rerun." >&2
  exit 1
fi

if [[ -d "$TARGET_DIR" ]]; then
  DIRTY="$(git -C "$TARGET_DIR" status --porcelain 2>/dev/null || true)"
  if [[ -n "$DIRTY" && "$FORCE" != "true" ]]; then
    echo "ERROR: worktree has uncommitted changes: $DIR" >&2
    echo "       Re-run with --force to remove anyway." >&2
    exit 1
  fi

  if [[ "$FORCE" == "true" ]]; then
    git -C "$CONTROLPLANE_ROOT" worktree remove --force "$DIR"
  else
    git -C "$CONTROLPLANE_ROOT" worktree remove "$DIR"
  fi
else
  echo "Worktree directory not found (skip remove): $TARGET_DIR" >&2
fi

if git -C "$CONTROLPLANE_ROOT" show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git -C "$CONTROLPLANE_ROOT" branch -D "$BRANCH"
fi

git -C "$CONTROLPLANE_ROOT" worktree prune

echo "OK: cleaned worktree ${DIR} and local branch ${BRANCH}"

