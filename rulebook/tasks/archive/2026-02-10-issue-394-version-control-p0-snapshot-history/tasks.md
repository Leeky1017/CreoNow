## 1. Specification

- [x] 1.1 审阅主 spec `openspec/specs/version-control/spec.md` 的 P0 需求与 5 个 Scenario
- [x] 1.2 审阅 change 文档：`proposal/tasks/specs/version-control-delta.md`
- [x] 1.3 完成 Dependency Sync Check（IPC Phase 0 + Document Management Phase 1 + editor-p0 保存事件）并记录 `NO_DRIFT`

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 S1 手动保存生成快照 → 测试用例映射
- [x] 2.2 S2 AI 修改被接受生成快照 → 测试用例映射
- [x] 2.3 S3 autosave 5 分钟合并 → 测试用例映射
- [x] 2.4 S4 打开版本历史入口与列表展示 → 测试用例映射
- [x] 2.5 S5 actor 图标/标识渲染 → 测试用例映射

## 3. Red（先写失败测试）

- [x] 3.1 新增/调整快照创建语义失败测试（`create` 通道 + reason 映射）
- [x] 3.2 新增/调整 autosave 合并策略失败测试（5 分钟窗口）
- [x] 3.3 新增/调整版本历史入口与 actor 展示失败测试
- [x] 3.4 RUN_LOG 记录 Red 命令与失败输出

## 4. Green（最小实现通过）

- [x] 4.1 补齐快照数据模型（含 `wordCount`）与最小 DAO 逻辑
- [x] 4.2 实现 `version:snapshot:create/list/read` IPC 通道并通过契约校验
- [x] 4.3 实现四类触发（manual/autosave/ai-accept/status-change）并对齐 reason
- [x] 4.4 实现 autosave 5 分钟窗口合并策略
- [x] 4.5 实现/接通版本历史入口（右键、Info、命令面板）与时间线展示

## 5. Refactor（保持绿灯）

- [x] 5.1 收敛快照创建逻辑，减少 `file:document:save` 与 `version:*` 重复路径
- [x] 5.2 全量回归（type/lint/contract/cross-module/unit/integration）保持绿灯

## 6. Evidence

- [x] 6.1 维护 `openspec/_ops/task_runs/ISSUE-394.md`（Scenario 映射、Red/Green、关键命令输出）
- [ ] 6.2 记录 preflight、required checks、PR auto-merge、main 收口与 cleanup 证据
