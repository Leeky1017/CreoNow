# Workbench Specification Delta

## Change: fe-editor-context-menu-and-tooltips

### Requirement: Tooltip 必须统一使用 Radix Tooltip [ADDED]

#### Scenario: Feature 层不得以 title 作为主 Tooltip 机制 [ADDED]

- **假设** Feature 组件需要展示 Tooltip
- **当** Tooltip 渲染
- **则** 必须使用 Radix Tooltip（或统一封装）
- **并且** 不得依赖原生 `title` 作为主要实现
