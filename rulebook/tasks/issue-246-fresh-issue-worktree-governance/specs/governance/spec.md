# Spec Delta: governance (ISSUE-246)

## Changes

- Add: 新任务准入必须使用当前 OPEN Issue，禁止复用历史/已关闭 Issue。
- Add: preflight 强制校验 `task/<N>-<slug>` 对应 Issue 状态为 `OPEN`。
- Add: preflight 强制校验 `RUN_LOG` 的 `PR` 字段为真实 PR URL（禁止占位符）。
- Add: auto-merge 脚本在创建 PR 后自动回填 `RUN_LOG` 的 PR 链接并重新 preflight。
- Fix: 回填 `openspec/_ops/task_runs/ISSUE-244.md` 的 `PR` 字段。

## Acceptance

- 在 closed Issue 分支执行 preflight 会失败并提示 issue 状态不合法。
- `RUN_LOG` 的 PR 占位符会被 preflight 阻断。
- 交付脚本创建 PR 后，`RUN_LOG` 自动回填真实 PR 链接，且重新 preflight 通过。
