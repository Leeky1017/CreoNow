# ISSUE-79

- Issue: #79
- Branch: task/79-design-spec-update
- PR: https://github.com/Leeky1017/CreoNow/pull/80

## Plan

- 更新 DESIGN_DECISIONS.md 强调色定义为纯白色系
- 重命名 17 个 UUID 设计稿为规范命名格式
- 添加 Agent 参考说明，明确设计稿与规范的关系

## Runs

### 2026-02-01 设计规范更新

**1. 强调色更新**

- Command: 修改 `design/DESIGN_DECISIONS.md`
- 改动内容:
  - §3.6 添加纯白强调色定义（`--color-accent: #ffffff`）
  - 知识图谱节点色改名为 `--color-node-*`
  - §7.3 拖拽指示线改用 `--color-accent`
  - 附录 B 添加 Agent 参考说明

**2. 设计稿重命名**

- Command: `mv design-*.html XX-name.html`
- 重命名映射:
  | 原文件名 | 新文件名 |
  |----------|----------|
  | design-0a285476-...html | 20-memory-panel.html |
  | design-7ccddead-...html | 20-memory-panel-alt.html |
  | design-65900f89-...html | 21-skills-picker.html |
  | design-7482d493-...html | 22-context-viewer.html |
  | design-85557324-...html | 23-version-history.html |
  | design-3a09f780-...html | 24-diff-view.html |
  | design-96f8a239-...html | 25-search-panel.html |
  | design-f3eae964-...html | 26-empty-states.html |
  | design-ac1a7875-...html | 27-loading-states.html |
  | design-66284919-...html | 28-template-picker.html |
  | design-dcbba17f-...html | 29-export-dialog.html |
  | design-32e1671e-...html | 30-zen-mode.html |
  | design-f08fa496-...html | 31-interaction-patterns.html |
  | design-8d50be7e-...html | 32-ai-streaming-states.html |
  | design-54c0893d-...html | 33-ai-dialogs.html |
  | design-7daed012-...html | 34-component-primitives.html |
  | design-e556280e-...html | 35-constraints-panel.html |

**3. 清理 Zone.Identifier 文件**

- Command: `rm -f *:Zone.Identifier`
- Key output: 删除 17 个 Windows Zone.Identifier 元数据文件
