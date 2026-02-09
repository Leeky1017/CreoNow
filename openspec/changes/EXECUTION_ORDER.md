# Active Changes Execution Order

更新时间：2026-02-09 16:10

适用范围：`openspec/changes/` 下所有非 `archive/`、非 `_template/` 的活跃 change。

## 执行策略

- 当前活跃 change 数量为 **2**。
- 执行模式：**串行执行**（先完成治理收口，再推进功能变更，降低规范漂移风险）。

## 执行顺序

1. `issue-338-governance-closeout-active-legacy`（进行中）
   - 目标：归档已合并 active changes（334/336）并清理关闭 issue 的历史 pending tasks（39/50）
   - 依赖：`issue-334`、`issue-336` 合并事实；`issue-39`、`issue-50` 关闭事实
2. `db-native-binding-doctor`（进行中）
   - 目标：补齐 DB native 绑定失败诊断并在 AI 面板提供可执行修复指引
   - 依赖：`issue-338` 治理收口后的 active/archive 状态基线；AI 面板既有 DB_ERROR 展示链路

## 依赖说明

- `issue-338-governance-closeout-active-legacy`：
  - Dependency Sync Check 输入：
    - `openspec/changes/archive/issue-334-archive-closeout-and-worktree-cleanup/*`
    - `openspec/changes/archive/issue-336-rulebook-archive-issue-334/*`
    - `rulebook/tasks/archive/2026-02-09-issue-39-p0-008-context-engineering/*`
    - `rulebook/tasks/archive/2026-02-09-issue-50-p0-012-search-embedding-rag/*`
  - 核对项：
    - active 目录与 archive 目录状态一致
    - 仅治理文档归档，无运行时代码与契约漂移
  - 结论：`无漂移`
- `db-native-binding-doctor`：
  - Dependency Sync Check 输入：
    - `openspec/specs/ai-service/spec.md`
    - `openspec/specs/ipc/spec.md`
    - `openspec/changes/issue-338-governance-closeout-active-legacy/*`
  - 核对项：
    - IPC 错误 envelope 保持 `{ ok: false, error }`，不新增分支
    - `DB_ERROR` 错误码保持不变，仅增强 `details` 可判定信息
    - AI 面板错误文案链路仅增强诊断说明，不改变交互主流程
  - 结论：`无漂移`

## 维护规则

- 任一活跃 change 的范围、依赖、状态发生变化时，必须同步更新本文件。
- 对有上游依赖的 change，进入 Red 前必须完成并落盘依赖同步检查（Dependency Sync Check）；若发现漂移先更新 change 文档再实现。
- 未同步更新本文件时，不得宣称执行顺序已确认。
