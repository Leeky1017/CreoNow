# Editor Delta Spec — editor-bubble-menu-crash-fix

## [MODIFIED] Requirement: Editor 内联格式浮动菜单（Bubble Menu）

Bubble Menu 的显示/隐藏语义保持不变，但实现策略必须避免在高频选区变化场景中的卸载竞态。

- 运行时应保持 `BubbleMenu` 组件稳定挂载。
- 显隐通过 `shouldShow` 判定控制，不通过反复 unmount/remount 控制。
- 在 AI apply 触发的选区变更链路中，不得导致渲染崩溃。

### Scenario: AI apply success 不触发 BubbleMenu 卸载竞态

- **GIVEN** 编辑器存在有效选区且 Bubble Menu 可见
- **WHEN** 用户执行 AI apply 成功路径并确认应用
- **THEN** 渲染进程保持稳定，不出现 `removeChild` 相关崩溃
- **AND** `ai-apply-status` 可见且文档内容正确更新

### Scenario: AI apply conflict 保持稳定并返回冲突保护

- **GIVEN** 选区已生成 proposal，随后用户手动修改选区内容
- **WHEN** 用户执行 AI apply 确认
- **THEN** 渲染进程保持稳定，不出现崩溃
- **AND** UI 返回 `CONFLICT` 错误并阻止覆盖用户已修改内容
