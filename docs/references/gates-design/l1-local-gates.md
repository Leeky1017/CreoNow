> 本文件是 gates-design 的一部分，完整索引见 [docs/references/gates-design/README.md](README.md)

# L1 — 本地门禁

- 触发时机：pre-commit / pre-push
- 检查项（当前已实现）：
    - pre-commit：控制面直接提交拦截 + main 分支提交拦截 + creonow-app/src/ 下 `.ts/.tsx` 文件的 lint-staged
    - pre-push：控制面直接推送拦截 + main 分支直接推送拦截
- 检查项（目标行为，尚未实现）：typecheck / 快速单测
- 失败行为：阻止 commit/push
- 实现：`.githooks/`（通过 `scripts/agent_git_hooks_install.sh` 安装）
- 紧急绕过：`CREONOW_ALLOW_CONTROLPLANE_BYPASS=1`

> **已实现位置**：`.githooks/pre-commit`、`.githooks/pre-push`（通过 `scripts/agent_git_hooks_install.sh` 安装到 `core.hooksPath`）。

---

## 实际 hook 行为

```bash
# .githooks/pre-commit
# 1. 控制面根目录提交拦截（必须在 worktree 中操作）
# 2. main 分支提交拦截（禁止在 main 上直接提交，建议使用 task/<N>-<slug> 分支）
# 3. creonow-app/src/ 下有 staged .ts/.tsx 文件时运行 lint-staged
#    注意：lint-staged 仅在 creonow-app/node_modules/.bin 存在时执行；
#    未运行 pnpm install 的 worktree 会静默跳过此检查。

# .githooks/pre-push
# 1. 控制面根目录推送拦截
# 2. 禁止直接推送到 refs/heads/main
```

## lint-staged 配置

位于 `creonow-app/package.json`：

```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --max-warnings 0",
      "prettier --check"
    ]
  }
}
```
