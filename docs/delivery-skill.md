# OpenSpec + Rulebook + GitHub 交付规则

本文件是 CreoNow 的交付规则主源（Source of Truth）。
本文件只定义约束条件和验收标准，不定义具体命令和脚本参数。

命令与脚本用法参见 `scripts/README.md`。

---

## 一、命名约定

| 实体     | 格式                                   | 示例                               |
| -------- | -------------------------------------- | ---------------------------------- |
| Issue    | GitHub Issue，自动分配编号 `N`         | `#42`                              |
| Branch   | `task/<N>-<slug>`                      | `task/42-memory-decay`             |
| Commit   | `<type>: <summary> (#<N>)`             | `feat: add memory decay (#42)`     |
| PR title | `<summary> (#<N>)`                     | `Add memory decay (#42)`           |
| PR body  | 必须包含 `Closes #<N>`                 | `Closes #42`                       |
| RUN_LOG  | `openspec/_ops/task_runs/ISSUE-<N>.md` | `ISSUE-42.md`                      |
| Worktree | `.worktrees/issue-<N>-<slug>`          | `.worktrees/issue-42-memory-decay` |

Commit type：`feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `ci`

---

## 二、交付规则（硬约束）

1. **Spec-first + Rulebook-first**：任何功能变更必须先有 OpenSpec spec，并且 Rulebook task 必须存在且通过 `validate`。
2. **红灯先行**：测试必须先失败再通过（Red → Green → Refactor），禁止先写实现再补测试。
3. **证据落盘**：关键命令输入输出必须写入 RUN_LOG，禁止 silent failure。
4. **门禁一致**：文档契约与 GitHub required checks 必须一致；不一致时必须阻断并升级。
5. **门禁全绿 + 串行合并**：PR 必须通过 `ci`、`openspec-log-guard`、`merge-serial`，并启用 auto-merge。

---

## 三、工作流阶段

| 阶段          | 完成条件                                                        |
| ------------- | --------------------------------------------------------------- |
| 1. 任务准入   | Issue 已创建或认领，`N` 和 `SLUG` 已确定                        |
| 2. 规格制定   | OpenSpec spec 已编写或更新；Rulebook task 已创建并通过 validate |
| 3. 环境隔离   | Worktree 已创建，工作目录已切换                                 |
| 4. 实现与测试 | 按 TDD 循环实现；所有测试通过；RUN_LOG 已记录                   |
| 5. 提交与合并 | PR 已创建；auto-merge 已开启；三个 checks 全绿；PR 已确认合并   |
| 6. 收口与归档 | 控制面已同步；worktree 已清理；Rulebook task 已归档             |

---

## 四、异常处理规则

| 情况                                 | 规则                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| `gh` 命令超时                        | 最多重试 3 次（间隔 10s），仍失败必须记录 RUN_LOG 并升级       |
| PR 需要 review                       | 记录 blocker，通知 reviewer，等待处理，禁止 silent abandonment |
| checks 失败                          | 修复后重新 push，重跑并记录失败原因和修复证据                  |
| Spec 不存在或不完整                  | 必须先补 spec 并确认，禁止猜测实现                             |
| Rulebook task 不存在或 validate 失败 | 阻断交付，先修复 Rulebook 再继续                               |
| 非 `task/*` 分支提交 PR              | 可跳过 RUN_LOG，但 PR body 必须包含 `Skip-Reason:`             |
| required checks 与本文件不一致       | 阻断交付并升级治理，禁止宣称“门禁全绿”                         |

---

## 五、三体系协作

```
OpenSpec（做什么）     Rulebook（怎么做）     GitHub（怎么验收）
openspec/             rulebook/tasks/        .github/workflows/
```

- **OpenSpec**：定义行为和约束，Agent 实现前必须阅读。
- **Rulebook**：记录任务拆解、执行与验证证据，交付前必须可验证。
- **GitHub**：以 required checks 和 auto-merge 作为最终验收门禁。

规则冲突时，以本文件为主源；`AGENTS.md` 与外部 Skill 必须保持一致。
