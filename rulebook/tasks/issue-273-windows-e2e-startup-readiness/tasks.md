## 1. Specification

- [x] 1.1 建立 change：`windows-e2e-startup-readiness`
- [x] 1.2 编写 proposal/tasks/delta spec（project-management + workbench）
- [x] 1.3 Rulebook validate 通过并记录

## 2. TDD

- [x] 2.1 记录 Windows E2E Red 失败证据
- [x] 2.2 先调整失败测试（等待策略 + 命令面板隔离）
- [x] 2.3 再做最小实现使其通过

## 3. Verification

- [x] 3.1 执行 targeted E2E（command-palette/version-history/ai-apply）
- [x] 3.2 执行 preflight（unit/integration/typecheck/lint + guard）
- [x] 3.3 RUN_LOG 回填完整证据

## 4. Delivery

- [x] 4.1 提交并推送分支
- [x] 4.2 创建 PR（Closes #273）并启用 auto-merge
- [ ] 4.3 等待 `ci` / `openspec-log-guard` / `merge-serial` 全绿
- [ ] 4.4 合并后收口到控制面 `main`，归档 change 与 rulebook task
