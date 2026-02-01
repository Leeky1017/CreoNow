# ISSUE-59

- Issue: #59
- Branch: task/59-tokens-css-complete
- PR: <fill-after-created>

## Plan

- 对照 `design/DESIGN_DECISIONS.md` 审计 `tokens.css`，补充缺失的 CSS 变量
- 重构阴影系统：几何在 `:root` 定义一次，`--color-shadow` 在主题中定义（DRY）
- 验证编译通过

## Runs

### 2026-02-01 补充 tokens.css 变量

**补充内容：**

1. 间距系统 §3.8：
   - `--space-10: 40px`
   - `--space-12: 48px`
   - `--space-16: 64px`
   - `--space-20: 80px`

2. 动效系统 §3.10：
   - `--ease-in: cubic-bezier(0.4, 0, 1, 1)`
   - `--ease-out: cubic-bezier(0, 0, 0.2, 1)`
   - `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`
   - `--duration-instant: 50ms`
   - `--duration-slower: 500ms`

3. z-index §5.1：
   - `--z-max: 9999`

4. 阴影系统 §3.7 重构：
   - 阴影几何 (`--shadow-sm/md/lg/xl`) 移至 `:root` 定义一次
   - `--color-shadow` 保留在各主题中定义

**验证：**
- Command: `pnpm run build`
- Key output: `✓ built in 1.93s` (renderer)
- Evidence: 编译成功，无错误
