# OpenSpec + Rulebook + GitHub 交付规则

本文件是 Agent 的交付指令（SKILL），定义约束条件和质量标准。不定义具体命令和脚本路径。

具体命令参见 `scripts/README.md`。

---

## 一、命名约定

| 实体      | 格式                                     | 示例                              |
| --------- | ---------------------------------------- | --------------------------------- |
| Issue     | GitHub Issue，自动分配编号 N              | `#42`                             |
| Branch    | `task/<N>-<slug>`                        | `task/42-memory-decay`            |
| Commit    | `<type>: <summary> (#<N>)`               | `feat: add memory decay (#42)`    |
| PR title  | `<summary> (#<N>)`                       | `Add memory decay (#42)`          |
| PR body   | 必须包含 `Closes #<N>`                   | `Closes #42`                      |
| RUN_LOG   | `openspec/_ops/task_runs/ISSUE-<N>.md`   | `ISSUE-42.md`                     |
| Worktree  | `.worktrees/issue-<N>-<slug>`            | `.worktrees/issue-42-memory-decay`|

Commit type：`feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `ci`

---

## 二、交付规则

1. **Spec-first** — 任何功能变更必须先有 OpenSpec spec，再写代码
2. **红灯先行** — 测试必须先失败再通过（Red → Green → Refactor），禁止先写实现再补测试
3. **证据落盘** — 关键命令的输入输出必须写入 RUN_LOG，禁止 silent failure
4. **门禁全绿** — PR 必须通过 `ci`、`openspec-log-guard`、`merge-serial` 三个 required checks
5. **串行合并** — 所有 PR 通过 auto-merge 串行化，禁止手动合并

---

## 三、工作流阶段

| 阶段             | 完成条件                                                       |
| ---------------- | -------------------------------------------------------------- |
| 1. 任务准入       | Issue 已创建或认领，N 和 SLUG 已确定                            |
| 2. 规格制定       | OpenSpec spec 已编写或更新；delta spec 已提交 Owner 审阅（如需要）|
| 3. 环境隔离       | Worktree 已创建，工作目录已切换                                  |
| 4. 实现与测试     | 按 TDD 循环实现；所有测试通过；RUN_LOG 已记录                    |
| 5. 提交与合并     | PR 已创建；auto-merge 已开启；三个 checks 全绿；PR 已确认合并    |
| 6. 收口与归档     | 控制面已同步；worktree 已清理                                    |

---

## 四、异常处理规则

| 情况                       | 规则                                                 |
| -------------------------- | ---------------------------------------------------- |
| `gh` 命令超时               | 最多重试 3 次（间隔 10s），仍失败 → 记录 RUN_LOG → 升级 |
| PR 需要 review              | 记录 blocker → 通知 reviewer → 等待，禁止 silent abandonment |
| checks 失败                 | 修复 → push → 再次 watch → 失败原因写入 RUN_LOG       |
| Spec 不存在或不完整          | 通知 Owner 请求补充 spec，禁止猜测着写代码              |
| 任务超出 spec 范围           | 先补 delta spec → 经 Owner 确认后再做                  |

---

## 五、三体系协作

```
OpenSpec（做什么）     Rulebook（怎么做）     GitHub（怎么验收）
specs/                tasks/               .github/
project.md            evidence/            scripts/
changes/                                   ci.yml
```

- **OpenSpec** 定义行为和约束 → Agent 写代码前读
- **Rulebook** 记录执行步骤和证据 → Agent 执行中写
- **GitHub** 自动验收（CI checks + PR review）→ CI 自动运行

Agent 读 AGENTS.md 理解宪法 → 读 spec 理解行为 → 按本文件的规则交付。
