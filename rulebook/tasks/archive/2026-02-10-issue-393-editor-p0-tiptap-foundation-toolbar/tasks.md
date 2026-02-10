## 1. Specification

- [x] 1.1 对齐 `openspec/specs/editor/spec.md` 与 change `editor-p0-tiptap-foundation-toolbar`
- [x] 1.2 完成 Dependency Sync Check（IPC P0 + Document Management P1）
- [x] 1.3 校验 change `tasks.md` 的 TDD 章节结构与 Red 门禁文本

## 2. TDD Mapping（先测前提）

- [x] 2.1 建立 13 个 Scenario 到测试文件映射
- [x] 2.2 先运行 Red 并保留失败证据，再进入实现

## 3. Red（先写失败测试）

- [x] 3.1 补齐工具栏/快捷键/粘贴 Scenario 的失败测试
- [x] 3.2 补齐 editorStore bootstrap Scenario 的失败测试
- [x] 3.3 补齐 autosave 状态机 Scenario 的失败测试

## 4. Green（最小实现通过）

- [x] 4.1 集成 Underline 扩展并完成编辑器基础能力缺口
- [x] 4.2 修复工具栏状态同步和快捷键展示/触发链路
- [x] 4.3 完成 autosave + bootstrap 相关最小实现并通过测试

## 5. Refactor（保持绿灯）

- [x] 5.1 抽象公共逻辑并保持测试全绿
- [x] 5.2 保持 lint/typecheck/contract/cross-module/test:unit 全绿

## 6. Evidence

- [x] 6.1 更新 `openspec/_ops/task_runs/ISSUE-393.md`（含 Red/Green/门禁证据）
- [ ] 6.2 创建 PR、启用 auto-merge，并验证收口到控制面 `main`
- [x] 6.3 归档 completed change 与 Rulebook task，清理 worktree
