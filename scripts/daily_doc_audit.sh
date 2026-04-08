#!/usr/bin/env bash
# daily_doc_audit.sh — 每日文档健康检查
# 扫描仓库中所有文档，校验路径引用、INV 定义、spec 完整性、脚本引用。
# 用法: scripts/daily_doc_audit.sh [--verbose]
# 退出码: 0 = 无问题, 1 = 发现问题

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

VERBOSE=false
[[ "${1:-}" == "--verbose" ]] && VERBOSE=true

ISSUES=()

log_issue() {
  ISSUES+=("$1")
  echo "[FAIL] $1"
}

log_ok() {
  $VERBOSE && echo "[OK]   $1" || true
}

log_skip() {
  $VERBOSE && echo "[SKIP] $1" || true
}

# ─────────────────────────────────────────────
# 1. 收集所有文档文件
# ─────────────────────────────────────────────
DOC_DIRS=(
  "."
  "docs"
  "docs/references"
  "docs/references/cc-analysis"
  "openspec/specs"
  ".github"
  ".github/agents"
  ".github/prompts"
  "scripts"
  "creonow-app"
  "figma_design"
)

MD_FILES=()
for dir in "${DOC_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    while IFS= read -r f; do
      MD_FILES+=("$f")
    done < <(find "$dir" -maxdepth 2 -name "*.md" -not -path "./node_modules/*" -not -path "./.worktrees/*" -not -path "./.git/*" 2>/dev/null)
  fi
done

# Deduplicate
readarray -t MD_FILES < <(printf '%s\n' "${MD_FILES[@]}" | sort -u)

echo "=== 文档健康检查 ==="
echo "扫描 ${#MD_FILES[@]} 个 Markdown 文件"
echo ""

# ─────────────────────────────────────────────
# 2. 校验 backtick 路径引用
# ─────────────────────────────────────────────
echo "--- 路径引用校验 ---"
path_checked=0
path_issues=0

for md in "${MD_FILES[@]}"; do
  # Extract backtick-quoted paths that look like file paths
  # Match patterns like `apps/desktop/...`, `packages/...`, `scripts/...`, `src/...`, `openspec/...`, `docs/...`
  while IFS= read -r path_ref; do
    # Skip URLs, anchors, placeholders, glob patterns
    [[ "$path_ref" =~ ^https?:// ]] && continue
    [[ "$path_ref" =~ ^#  ]] && continue
    [[ "$path_ref" =~ \<  ]] && continue
    [[ "$path_ref" =~ \*  ]] && continue
    [[ "$path_ref" =~ \{  ]] && continue
    [[ "$path_ref" =~ \.\.\.$ ]] && continue
    # Skip bare filenames without path separators (likely code references)
    [[ ! "$path_ref" =~ / ]] && continue
    # Skip paths that are clearly code snippets
    [[ "$path_ref" =~ ^var\( ]] && continue
    [[ "$path_ref" =~ = ]] && continue
    [[ "$path_ref" =~ \| ]] && continue

    # Normalize: strip trailing punctuation
    path_ref="${path_ref%%,}"
    path_ref="${path_ref%%:}"
    path_ref="${path_ref%%）}"

    # Only check paths that start with known project directories
    if [[ "$path_ref" =~ ^(apps/|packages/|scripts/|openspec/|docs/|\.github/|design/|figma_design/|creonow-app/) ]]; then
      # Strip arguments from script-like paths (e.g. "scripts/foo.sh L [ref]" → "scripts/foo.sh")
      check_path="$path_ref"
      if [[ "$check_path" =~ \.(sh|py|ts|js|mjs) ]]; then
        check_path="${check_path%% *}"
      fi
      path_checked=$((path_checked + 1))
      if [[ -e "$check_path" ]]; then
        log_ok "$md → $check_path"
      else
        # Check if it's explicitly marked as planned
        if grep -q "目标架构\|尚未实现\|待创建\|<!-- planned -->" "$md" 2>/dev/null; then
          log_skip "$md → $path_ref (marked as planned)"
        else
          log_issue "$md: 引用路径不存在 → $path_ref"
          path_issues=$((path_issues + 1))
        fi
      fi
    fi
  done < <(grep -oP '`([^`]+)`' "$md" 2>/dev/null | sed 's/^`//;s/`$//' || true)
done

echo "路径引用: 检查 $path_checked 个, 问题 $path_issues 个"
echo ""

# ─────────────────────────────────────────────
# 3. 校验 INV-* 引用与 ARCHITECTURE.md 定义一致
# ─────────────────────────────────────────────
echo "--- INV 定义校验 ---"

# Extract defined INVs from ARCHITECTURE.md
DEFINED_INVS=()
if [[ -f "ARCHITECTURE.md" ]]; then
  while IFS= read -r inv; do
    DEFINED_INVS+=("$inv")
  done < <(grep -oP 'INV-\d+' ARCHITECTURE.md | sort -u)
fi

inv_issues=0
for md in "${MD_FILES[@]}"; do
  [[ "$md" == "./ARCHITECTURE.md" ]] && continue
  while IFS= read -r inv_ref; do
    found=false
    for defined in "${DEFINED_INVS[@]}"; do
      [[ "$inv_ref" == "$defined" ]] && found=true && break
    done
    if ! $found; then
      log_issue "$md: 引用 $inv_ref 未在 ARCHITECTURE.md 中定义"
      inv_issues=$((inv_issues + 1))
    else
      log_ok "$md → $inv_ref"
    fi
  done < <(grep -oP 'INV-\d+' "$md" 2>/dev/null | sort -u || true)
done

echo "INV 引用: 问题 $inv_issues 个"
echo ""

# ─────────────────────────────────────────────
# 4. 校验 openspec/specs/<module>/ 都有 spec.md
# ─────────────────────────────────────────────
echo "--- OpenSpec 完整性校验 ---"
spec_issues=0

if [[ -d "openspec/specs" ]]; then
  for dir in openspec/specs/*/; do
    module="$(basename "$dir")"
    if [[ ! -f "${dir}spec.md" ]]; then
      log_issue "openspec/specs/$module/ 缺少 spec.md"
      spec_issues=$((spec_issues + 1))
    else
      log_ok "openspec/specs/$module/spec.md"
    fi
  done
fi

echo "OpenSpec: 问题 $spec_issues 个"
echo ""

# ─────────────────────────────────────────────
# 5. 校验脚本引用
# ─────────────────────────────────────────────
echo "--- 脚本引用校验 ---"
script_issues=0

for md in "${MD_FILES[@]}"; do
  while IFS= read -r script_ref; do
    # Only check references that look like scripts/something
    [[ "$script_ref" =~ ^scripts/ ]] || continue
    # Skip directory references
    [[ "$script_ref" =~ /$ ]] && continue
    # Skip glob patterns
    [[ "$script_ref" =~ \* ]] && continue

    # Strip trailing punctuation
    script_ref="${script_ref%%,}"
    script_ref="${script_ref%%:}"

    # Strip arguments after the script filename (e.g. "scripts/foo.sh <N> <slug>" → "scripts/foo.sh")
    script_file="${script_ref%% *}"

    if [[ -f "$script_file" ]]; then
      log_ok "$md → $script_file"
    else
      log_issue "$md: 引用脚本不存在 → $script_ref"
      script_issues=$((script_issues + 1))
    fi
  done < <(grep -oP '`(scripts/[^`]+)`' "$md" 2>/dev/null | sed 's/^`//;s/`$//' || true)
done

echo "脚本引用: 问题 $script_issues 个"
echo ""

# ─────────────────────────────────────────────
# 6. 检查常见过时模式
# ─────────────────────────────────────────────
echo "--- 过时模式检查 ---"
stale_issues=0

# Check for references to root pnpm scripts that don't exist
STALE_COMMANDS=("pnpm lint" "pnpm format:check" "pnpm format " "pnpm test:visual")

for md in "${MD_FILES[@]}"; do
  for cmd in "${STALE_COMMANDS[@]}"; do
    if grep -q "$cmd" "$md" 2>/dev/null; then
      # Skip if marked as planned in the same file
      if grep -B2 -A2 "$cmd" "$md" 2>/dev/null | grep -qi "计划\|計劃\|planned\|TODO\|计划实现"; then
        log_skip "$md: '$cmd' marked as planned"
        continue
      fi
      # Verify command doesn't exist in root package.json
      script_name="${cmd#pnpm }"
      script_name="${script_name%% *}"
      if ! python3 -c "import json; d=json.load(open('package.json')); exit(0 if '$script_name' in d.get('scripts',{}) else 1)" 2>/dev/null; then
        log_issue "$md: 引用不存在的根级命令 '$cmd'（不在 root package.json 中）"
        stale_issues=$((stale_issues + 1))
      fi
    fi
  done
done

echo "过时模式: 问题 $stale_issues 个"
echo ""

# ─────────────────────────────────────────────
# 汇总
# ─────────────────────────────────────────────
total_issues=${#ISSUES[@]}
echo "==========================================="
echo "总计: $total_issues 个问题"

if [[ $total_issues -gt 0 ]]; then
  echo ""
  echo "问题清单:"
  for issue in "${ISSUES[@]}"; do
    echo "  - $issue"
  done
  exit 1
else
  echo "[OK] 全部通过"
  exit 0
fi
