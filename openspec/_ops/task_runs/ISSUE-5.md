# ISSUE-5
- Issue: #5
- Branch: task/5-design-spec-audit
- PR: https://github.com/Leeky1017/CreoNow/pull/6

## Plan
- 修复快捷键冲突（Cmd/Ctrl+B → Cmd/Ctrl+\ 用于侧边栏）
- 统一主题 Tokens 作用域（:root[data-theme="dark/light"]）
- 收敛 PreferenceStore 类型约束

## Runs
### 2026-01-30 审计与修复
- Command: `grep + read + patch`
- Key output:
  - 快捷键冲突：`Cmd/Ctrl+B` 同时用于侧边栏折叠和编辑器加粗 → 侧边栏改为 `Cmd/Ctrl+\`
  - 主题变量：背景/前景/边框/focus 等主题变量改为 `:root[data-theme]` 选择器
  - 阴影系统：`--shadow-*` 合并到 `:root` 一次定义，强度由 `--color-shadow` 控制
  - Focus Ring：理由改为"避免与 elevation box-shadow 叠加"
  - PreferenceStore：`key: string` → `key: PreferenceKey`
  - 滚动条：`border-radius: 3px` → `var(--radius-full)`
- Evidence: `git diff --stat` shows +91/-76 lines
