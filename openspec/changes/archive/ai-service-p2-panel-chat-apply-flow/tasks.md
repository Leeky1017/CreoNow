## 1. Specification

- [x] 1.1 审阅 `ai:chat:list|send|clear` 契约与 projectId 隔离要求
- [x] 1.2 审阅面板结构、空态文案与操作按钮最小集合
- [x] 1.3 审阅「应用到编辑器 -> Inline Diff -> 用户确认」链路
- [x] 1.4 依赖同步检查（Dependency Sync Check）：依赖 `ai-service-p1-streaming-cancel-lifecycle`；结论 `NO_DRIFT`
- [x] 1.5 Out-of-scope 确认：不进入 Judge、多候选、用量统计

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S1「chat IPC 按项目隔离」→ `apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
- [x] 2.2 S2「应用到编辑器需经 Inline Diff」→ `apps/desktop/renderer/src/features/ai/__tests__/apply-to-editor-inline-diff.test.tsx`
- [x] 2.3 S3「AI 面板四态 Storybook 可验证」→ `apps/desktop/renderer/src/features/ai/AiPanel.stories.test.ts`
- [x] 2.4 建立 Scenario ID 到测试文件与断言点映射

## 3. Red（先写失败测试）

- [x] 3.1 编写 S1 失败测试（跨项目历史泄露时失败）
- [x] 3.2 编写 S2 失败测试（跳过 Inline Diff 直接写入时失败）
- [x] 3.3 编写 S3 失败测试（四态缺失任一态即失败）
- [x] 3.4 将失败日志与快照证据写入 RUN_LOG

## 4. Green（最小实现通过）

- [x] 4.1 最小实现 `ai:chat:*` 契约与 projectId 隔离
- [x] 4.2 最小实现面板结构与规范文案
- [x] 4.3 最小实现应用链路接入 Inline Diff
- [x] 4.4 补齐 Storybook 四态并让 Red 全转绿

## 5. Refactor（保持绿灯）

- [x] 5.1 去重面板状态机与按钮动作分支
- [x] 5.2 复用编辑器现有 diff 组件，避免双栈实现
- [x] 5.3 保持 UI token 引用与契约响应格式不变

## 6. Evidence

- [x] 6.1 RUN_LOG 记录 Red/Green 命令输出和关键断言
- [x] 6.2 记录 依赖同步检查（Dependency Sync Check）（数据结构/IPC/错误码/阈值）= `NO_DRIFT`
- [x] 6.3 记录 Storybook 四态截图或测试报告索引
