## 1. Implementation（Spec-only）

- [ ] 1.1 对齐 Storybook Inventory SSOT
  - [ ] 1.1.1 提取并确认当前 stories 数量与集合（截至 2026-02-05：56/56）
  - [ ] 1.1.2 清理规范内的过期资产假设（例如已移除的 ContextViewer）
- [ ] 1.2 补齐设计文档（对应审计建议）
  - [ ] 1.2.1 Design 06：逐项补齐清单（字段/动作/IPC/测试/PR 粒度）
  - [ ] 1.2.2 Design 07：IPC 接口规范（可直接实现/可直接写测试）
  - [ ] 1.2.3 Design 08：Test & QA matrix（含 RUN_LOG 证据格式）
  - [ ] 1.2.4 Design 09：并行/冲突/分期建议（高冲突文件串行约束）
- [ ] 1.3 细化所有 P0 任务卡
  - [ ] 1.3.1 每卡补齐：Assets in scope / Detailed breakdown / Conflict notes / Evidence 口径
  - [ ] 1.3.2 P0-013 重命名为 AI Surface 组装（以现有资产为准）

## 2. Testing
- [ ] 2.1 文档一致性检查
  - [ ] 2.1.1 `rg` 确保无 `57`/无 `ContextViewer` 等过期引用（在本 spec 范围内）
  - [ ] 2.1.2 关键引用路径一致（Design 06/07/08/09 与 task cards/index 对齐）

## 3. Documentation
- [ ] 3.1 更新 RUN_LOG（Issue/Branch/Plan/Runs；Runs 只追加不回写）
- [ ] 3.2 提供给非程序员的验收入口（Design 05 + Design 08 的证据格式）
