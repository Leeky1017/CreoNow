## 1. Specification

- [x] 1.1 审阅 `openspec/specs/ai-service/spec.md` 与 delta 约束（聊天隔离 / Inline Diff / 四态 Story）
- [x] 1.2 完成 Dependency Sync Check（依赖 `ai-service-p1-streaming-cancel-lifecycle`）并记录 `NO_DRIFT`
- [x] 1.3 确认 out-of-scope：Judge / 多候选 / 用量统计不进入本次实现

## 2. TDD Mapping（先测前提）

- [x] 2.1 S1「chat IPC 按项目隔离」→ `apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
- [x] 2.2 S2「应用到编辑器需经 Inline Diff」→ `apps/desktop/renderer/src/features/ai/__tests__/apply-to-editor-inline-diff.test.tsx`
- [x] 2.3 S3「AI 面板四态可独立验证」→ `apps/desktop/renderer/src/features/ai/AiPanel.stories.test.ts`
- [x] 2.4 未出现 Red 失败证据前不得进入 Green

## 3. Red（先写失败测试）

- [x] 3.1 S1 失败：缺失 list/clear 或跨项目隔离不成立时失败
- [x] 3.2 S2 失败：点击应用即直接写入（未经过 Inline Diff 确认）时失败
- [x] 3.3 S3 失败：Storybook 四态缺任一态时失败

## 4. Green（最小实现通过）

- [x] 4.1 实现 `ai:chat:list|send|clear` 与 `projectId` 隔离
- [x] 4.2 实现“Inline Diff 预览 -> 用户确认 -> 写入/持久化”链路
- [x] 4.3 补齐并导出 `AiPanel` 四态 Story，所有 Red 用例转绿
- [x] 4.4 运行 `pnpm contract:generate` 同步 IPC 类型

## 5. Refactor（保持绿灯）

- [x] 5.1 统一聊天消息结构与错误返回格式（`ok: true|false`）
- [x] 5.2 收敛 AI 面板操作区按钮状态分支，避免重复逻辑
- [x] 5.3 保持设计 token 与现有交互样式一致

## 6. Evidence

- [x] 6.1 `openspec/_ops/task_runs/ISSUE-367.md` 记录 Red/Green 命令与输出
- [x] 6.2 记录 Dependency Sync Check（数据结构/IPC/错误码/阈值）结论 `NO_DRIFT`
- [ ] 6.3 记录 preflight 与 required checks 证据，完成 main 收口与 Rulebook 归档
