# Branch Protection 配置建议

> 以下配置需要 repo admin 在 GitHub Settings → Branches → Branch protection rules 中手动设置。

## `main` 分支保护规则

| 设置项 | 推荐值 | 说明 |
|--------|--------|------|
| Require a pull request before merging | ✅ 开启 | 禁止直接 push 到 main |
| Require status checks to pass | ✅ 开启 | 所有 CI job 必须通过 |
| Required status checks | `lint-and-typecheck`, `test-core`, `test-renderer`, `storybook`, `build` | 与 ci.yml jobs 对应 |
| Require branches to be up to date | ✅ 开启 | PR 必须基于最新 main |
| Require conversation resolution | ✅ 开启 | 所有 review 对话必须解决 |
| Do not allow bypassing | ✅ 开启 | 即使 admin 也不能绕过 |

## 设置步骤

1. 进入 GitHub 仓库 → Settings → Branches
2. 点击 "Add branch protection rule"
3. Branch name pattern 填 `main`
4. 按上表勾选选项
5. 保存
