# Document Management Specification Delta

## Change: issue-332-cross-module-drift-zero

### Requirement: 项目导出通道命名治理对齐 [MODIFIED]

项目级导出通道统一为 `export:project:bundle`，替代历史两段式 `export:project`，以满足 IPC 命名治理。

#### Scenario: 项目导出使用 3 段式通道 [MODIFIED] (S7)

- **假设** 用户在项目菜单触发“导出项目”
- **当** 渲染进程调用主进程导出能力
- **则** 使用 `export:project:bundle`
- **并且** 返回结构化导出结果（相对路径与写入字节数）
