## 1. Specification
- [x] 1.1 创建 `db-native-binding-doctor` change（proposal/tasks/spec delta）
- [x] 1.2 明确 DB 失败分类与修复命令契约
- [ ] 1.3 Rulebook task 通过 validate

## 2. TDD
- [ ] 2.1 先写 `db-native-doctor` 单测（Red）
- [ ] 2.2 先写 IPC DB diagnostics 单测（Red）
- [ ] 2.3 先写 AI 面板 DB 提示单测（Red）
- [x] 2.4 最小实现让新增测试转绿（Green）

## 3. Verification
- [x] 3.1 运行 targeted tests（doctor / IPC / AiPanel）
- [x] 3.2 运行 `pnpm typecheck` 与 `pnpm lint`
- [x] 3.3 更新 RUN_LOG 记录 Red/Green 证据

## 4. Delivery
- [ ] 4.1 提交并推送 `task/266-db-native-binding-doctor`
- [ ] 4.2 用户确认后再创建 PR（Closes #266）
