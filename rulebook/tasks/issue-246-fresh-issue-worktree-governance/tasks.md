## 1. Implementation

- [x] 1.1 更新治理规则文档（`AGENTS.md`、`docs/delivery-skill.md`）明确禁止复用旧/已关闭 Issue
- [x] 1.2 增强 preflight 与交付脚本，加入 Issue OPEN 校验和 RUN_LOG PR 自动回填

## 2. Testing

- [x] 2.1 Red：preflight 在 RUN_LOG PR 为占位符时失败（预期）
- [x] 2.2 Green：自动回填后 preflight 通过，交付脚本完成 auto-merge

## 3. Documentation

- [x] 3.1 在 `docs/delivery-skill.md` 记录“防返工复盘（强制对齐）”
- [x] 3.2 回填 `openspec/_ops/task_runs/ISSUE-244.md` 的 PR 链接
